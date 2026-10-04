# %% [markdown]
# # Geiger feed enrich — image embeddings + captions
#
# Fills two tables in Aiven for the crawled feed images (`content.feed_crawl_images`):
#
# 1. **Embeddings** — `nomic-embed-vision-v1.5` (768-d, same space as `nomic-embed-text-v1.5`) → `content.feed_image_embeddings`
# 2. **Captions** — a small Qwen vision LLM writes a description + tags → `content.feed_image_captions`
#
# **One shared pool:** every copy of this notebook claims the next unclaimed images from the database
# (`content.feed_enrich_leases`), so you can run it on several Kaggle accounts, Colab and a local GPU at the
# same time with no settings to coordinate. Stop or restart any of them whenever you like — finished work is
# saved every few dozen images and a stopped worker's claims are released after 20 minutes.
#
# **Kaggle:** Accelerator **GPU T4 x2**, Internet **on**; "Save Version → Save & Run All" runs up to 12 h in the background.
# **Colab:** Runtime → T4 GPU. **Local:** `python feed_enrich.py` with `FEED_EMBED_DATABASE_URL` set (needs ~15 GB disk).
# The database URL is filled in when built with `npm run feed:embed -- build` — keep the notebook private.
# Otherwise add a secret named `FEED_EMBED_DATABASE_URL` (Kaggle Add-ons → Secrets, or Colab's key icon).

# %%
# ---- Settings ---------------------------------------------------------------------------------
RUN_EMBED = True            # phase 1: image embeddings (fast; skips instantly once everything is embedded)
RUN_CAPTIONS = True         # phase 2: descriptions (slow; every worker you add speeds it up)

# Qwen3-VL works on the pinned transformers below. For Qwen3.5 ("Qwen/Qwen3.5-4B" / "Qwen/Qwen3.5-2B") set
# TRANSFORMERS = "transformers>=5.3" and RUN_EMBED = False (Nomic's remote code targets transformers 4.x).
# Every worker in the pool should use the same CAPTION_MODEL: rows and claims are kept per model.
CAPTION_MODEL = "Qwen/Qwen3-VL-4B-Instruct"
# Used when the main model overflows in fp16 on a T4/P100 and doesn't fit in fp32: 2B in fp32 fits in 16 GB.
FALLBACK_MODEL = "Qwen/Qwen3-VL-2B-Instruct"
TRANSFORMERS = "transformers>=4.57,<5"

EMBED_BATCH = 64            # images per Nomic forward pass
CAPTION_BATCH = 0           # images per generate() call; 0 = size it from free GPU memory (halves itself on OOM)
CAPTION_MAX_SIDE = 448      # images are shrunk to this longest side before captioning (fewer vision tokens)
CAPTION_MAX_TOKENS = 160
DOWNLOAD_THREADS = 64       # downloads are network-bound; the GPU waits on them, not the other way round
MAX_HOURS = 11.5            # stop cleanly before Kaggle's 12 h limit (raise it for a local GPU)
RETRY_FAILED = False        # True = also retry images that failed before (up to 3 attempts; deleted images never)
WORKER_NAME = ""            # shows up in the database; default is the platform + host name

DB_URL = ""                 # leave empty to read the FEED_EMBED_DATABASE_URL secret / environment variable

# %%
# ---- Install ----------------------------------------------------------------------------------
import subprocess
import sys

subprocess.run([sys.executable, "-m", "pip", "install", "-q", TRANSFORMERS, "accelerate", "einops", "timm", "psycopg[binary]"], check=True)

# %%
# ---- Shared helpers: database, work pool, downloads, progress -------------------------------
import io
import json
import os
import re
import socket
import threading
import time
import uuid
from concurrent.futures import ThreadPoolExecutor

import psycopg
import requests
import torch
from PIL import Image


def secret(name):
    try:
        from kaggle_secrets import UserSecretsClient
        return UserSecretsClient().get_secret(name)
    except Exception:  # noqa: BLE001 - not on Kaggle or no such secret
        pass
    try:
        from google.colab import userdata
        return userdata.get(name)
    except Exception:  # noqa: BLE001 - not on Colab or no such secret
        pass
    return os.environ.get(name, "")


DB_URL = DB_URL or secret("FEED_EMBED_DATABASE_URL")
assert DB_URL, "Set DB_URL in the settings cell or add the FEED_EMBED_DATABASE_URL secret."

PLATFORM = "kaggle" if os.path.exists("/kaggle") else "colab" if "google.colab" in sys.modules or os.path.exists("/content") else "local"
WORKER = WORKER_NAME or f"{PLATFORM}-{socket.gethostname()}"
EMBED_MODEL_ID = "nomic-ai/nomic-embed-vision-v1.5"
EMBED_MODEL = "nomic-embed-vision-v1.5"  # must match FEED_MODEL in lib/feed/vectors.mjs
MAX_ATTEMPTS = 3
LEASE_MINUTES = 20
HEADERS = {"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) geiger-feed-enrich/1.0"}
STARTED = time.time()


def out_of_time():
    return time.time() - STARTED > MAX_HOURS * 3600


class Db:
    """One autocommit connection that reconnects on network errors (use one per thread)."""

    def __init__(self):
        self.conn = None

    def run(self, sql, params=None, fetch=False):
        for attempt in range(4):
            try:
                if self.conn is None or self.conn.closed:
                    self.conn = psycopg.connect(DB_URL, autocommit=True, keepalives=1, keepalives_idle=30)
                with self.conn.cursor() as cur:
                    cur.execute(sql, params)
                    return cur.fetchall() if fetch else cur.rowcount
            except psycopg.OperationalError as e:
                print(f"db error ({str(e).strip()[:120]}); reconnecting", flush=True)
                self.conn = None
                time.sleep(5 * (attempt + 1))
        raise RuntimeError("database unavailable")


# Still to do for `model` in `table`: no row yet (or a retryable failure). Images whose file is gone
# (404/410 when embedding) are skipped everywhere: the Reddit post was deleted.
def todo_filter(table):
    return f"""
      i.deleted_at is null
      and not exists (select 1 from content.feed_image_embeddings d where d.image_id = i.id and d.status = 'failed' and d.error in ('http 404', 'http 410'))
      and not exists (
        select 1 from content.{table} x
        where x.image_id = i.id and x.model = %(model)s
          and (x.status = 'done' or not %(retry)s or x.attempts >= %(max_attempts)s))"""


# Claims up to n unclaimed images after a random starting point (so workers rarely collide); a claim held
# by another worker is skipped by the unique (image_id, task) row, an expired one is taken over.
def claim_sql(table):
    return f"""
    with candidates as (
      select i.id from content.feed_crawl_images i
      where {todo_filter(table)}
        and i.id > %(start)s::uuid
        and not exists (select 1 from content.feed_enrich_leases l where l.image_id = i.id and l.task = %(task)s and l.lease_until > now())
      order by i.id limit %(n)s
    ), claimed as (
      insert into content.feed_enrich_leases (image_id, task, worker, lease_until)
      select id, %(task)s, %(worker)s, now() + make_interval(mins => %(lease)s) from candidates
      on conflict (image_id, task) do update set worker = excluded.worker, lease_until = excluded.lease_until
        where content.feed_enrich_leases.lease_until < now()
      returning image_id
    )
    select i.id::text, i.image_url, coalesce(i.record->>'title', '') from content.feed_crawl_images i
    join claimed c on c.image_id = i.id order by i.id
    """


def remaining(db, table, model):
    sql = f"select count(*) from content.feed_crawl_images i where {todo_filter(table)}"
    return db.run(sql, {"model": model, "retry": RETRY_FAILED, "max_attempts": MAX_ATTEMPTS}, fetch=True)[0][0]


def claimed_batches(db, table, model, chunk, worker):
    """Yields lists of (image_id, url, title) claimed from the shared pool until it is empty (or time runs out)."""
    sql = claim_sql(table)
    task = f"{'embed' if table == 'feed_image_embeddings' else 'caption'}:{model}"
    misses = 0
    while not out_of_time():
        start = str(uuid.uuid4()) if misses == 0 else "00000000-0000-0000-0000-000000000000"
        rows = db.run(sql, {"model": model, "retry": RETRY_FAILED, "max_attempts": MAX_ATTEMPTS, "start": start, "task": task,
                            "worker": worker, "lease": LEASE_MINUTES, "n": chunk}, fetch=True)
        if rows:
            misses = 0
            yield rows
            continue
        misses += 1
        if misses >= 2:  # nothing after a random start nor from the beginning
            if remaining(db, table, model) == 0:
                return
            time.sleep(30)  # everything left is claimed by other workers; wait for their claims to finish or expire
            misses = 0


def download(url, max_side=512):
    try:
        r = requests.get(url, headers=HEADERS, timeout=20)
        if r.status_code != 200:
            return None, f"http {r.status_code}"
        if not r.headers.get("content-type", "").startswith("image/"):
            return None, f"not an image ({r.headers.get('content-type', '?')[:40]})"
        img = Image.open(io.BytesIO(r.content))
        img.draft("RGB", (max_side, max_side))  # JPEGs decode straight at reduced size (much less CPU)
        img = img.convert("RGB")
        img.thumbnail((max_side, max_side))
        return img, None
    except Exception as e:  # noqa: BLE001 - any failure just marks the image failed
        return None, f"{type(e).__name__}: {e}"[:200]


def prefetched(db, table, model, chunk, max_side, pool, worker):
    """Claimed batches, downloading the next one while the caller works on the current one → (ok, bad)."""
    source = claimed_batches(db, table, model, chunk, worker)
    submit = lambda rows: [(row, pool.submit(download, row[1], max_side)) for row in rows]  # noqa: E731
    current = next(source, None)
    pending = submit(current) if current else None
    while pending:
        nxt = next(source, None)
        nxt_pending = submit(nxt) if nxt else None
        ok, bad = [], []
        for (image_id, _, title), future in pending:
            img, err = future.result()
            (ok.append((image_id, img, title)) if img is not None else bad.append((image_id, err)))
        yield ok, bad
        pending = nxt_pending


class Progress:
    """This notebook's rate, plus the whole pool's rate and ETA from the database every minute."""

    def __init__(self, label, table, model):
        self.label, self.table, self.model = label, table, model
        self.done, self.failed, self.t0, self.last_pool = 0, 0, time.time(), 0
        self.lock = threading.Lock()
        self.db = Db()

    def add(self, done, failed):
        with self.lock:
            self.done += done
            self.failed += failed
            rate = (self.done + self.failed) / max(1.0, time.time() - self.t0)
            line = f"[{self.label}] this worker: {self.done:,} done · {self.failed:,} failed · {rate:.2f}/s"
            if time.time() - self.last_pool > 60:
                self.last_pool = time.time()
                left = remaining(self.db, self.table, self.model)
                recent = self.db.run(f"select count(*) from content.{self.table} where model = %s and updated_at > now() - interval '10 minutes'",
                                     (self.model,), fetch=True)[0][0]
                pool_rate = recent / 600
                eta = f"{left / pool_rate / 3600:.1f} h" if pool_rate > 0 else "?"
                line += f"  |  pool: {left:,} left · {pool_rate:.2f}/s across all workers · ETA {eta}"
            print(line, flush=True)


print(f"worker {WORKER} · GPUs: {torch.cuda.device_count()} × {torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'none'}")

# %%
# ---- Phase 1: image embeddings (nomic-embed-vision-v1.5) ------------------------------------
import torch.nn.functional as F

EMBED_DONE_SQL = """
insert into content.feed_image_embeddings (image_id, model, status, embedding, worker, metadata)
select t.id, %(model)s, 'done', t.emb::public.halfvec, %(worker)s, jsonb_build_object('source', %(platform)s)
from unnest(%(ids)s::uuid[], %(embs)s::text[]) as t(id, emb)
on conflict (image_id, model) do update set status = 'done', embedding = excluded.embedding, error = null,
  attempts = content.feed_image_embeddings.attempts + 1, worker = excluded.worker, updated_at = now()
"""

FAILED_SQL = """
insert into content.{table} (image_id, model, status, error, worker)
select t.id, %(model)s, 'failed', t.err, %(worker)s from unnest(%(ids)s::uuid[], %(errs)s::text[]) as t(id, err)
on conflict (image_id, model) do update set error = excluded.error,
  attempts = content.{table}.attempts + 1, worker = excluded.worker, updated_at = now()
where content.{table}.status <> 'done'
"""


def run_embeddings():
    from transformers import AutoImageProcessor, AutoModel

    db = Db()
    total = remaining(db, "feed_image_embeddings", EMBED_MODEL)
    print(f"embeddings: {total:,} images left in the pool")
    if not total:
        return
    device = "cuda" if torch.cuda.is_available() else "cpu"
    # Fast (torchvision) processor resizes/normalises on the GPU instead of the CPU cores.
    slow = AutoImageProcessor.from_pretrained(EMBED_MODEL_ID)
    try:
        fast = AutoImageProcessor.from_pretrained(EMBED_MODEL_ID, use_fast=True)
        fast = fast if type(fast).__name__.endswith("Fast") else None
    except Exception:  # noqa: BLE001 - older processor configs
        fast = None

    def prep(images):
        nonlocal fast
        if fast is not None:
            try:
                return fast(images, return_tensors="pt", device=device).to(device)
            except Exception as e:  # noqa: BLE001 - never fail a batch because of the fast path
                print(f"fast processor failed ({type(e).__name__}); using the standard one", flush=True)
                fast = None
        return slow(images, return_tensors="pt").to(device)

    model = AutoModel.from_pretrained(EMBED_MODEL_ID, trust_remote_code=True).to(device).eval()
    if device == "cuda":
        model = model.half()
    worker = f"{WORKER}-embed"
    base = {"model": EMBED_MODEL, "worker": worker, "platform": PLATFORM}
    progress = Progress("embed", "feed_image_embeddings", EMBED_MODEL)
    with ThreadPoolExecutor(DOWNLOAD_THREADS) as pool:
        for ok, bad in prefetched(db, "feed_image_embeddings", EMBED_MODEL, 512, 512, pool, worker):
            done = 0
            for i in range(0, len(ok), EMBED_BATCH):
                part = ok[i:i + EMBED_BATCH]
                try:
                    with torch.no_grad():
                        inputs = prep([img for _, img, _ in part])
                        if device == "cuda":
                            inputs = {k: v.half() if v.is_floating_point() else v for k, v in inputs.items()}
                        hidden = model(**inputs).last_hidden_state
                        emb = F.normalize(hidden[:, 0].float(), p=2, dim=1).cpu().tolist()
                except Exception as e:  # noqa: BLE001 - a bad batch must not stop the run
                    bad.extend((image_id, f"embed {type(e).__name__}: {e}"[:200]) for image_id, _, _ in part)
                    continue
                vectors = ["[" + ",".join(f"{x:.6f}" for x in v) + "]" for v in emb]
                db.run(EMBED_DONE_SQL, {**base, "ids": [image_id for image_id, _, _ in part], "embs": vectors})
                done += len(part)
            if bad:
                db.run(FAILED_SQL.format(table="feed_image_embeddings"), {**base, "ids": [b[0] for b in bad], "errs": [b[1] for b in bad]})
            progress.add(done, len(bad))
    del model
    torch.cuda.empty_cache()


if RUN_EMBED:
    run_embeddings()

# %%
# ---- Phase 2: captions (small Qwen vision LLM) ------------------------------------------------
PROMPT = """Describe this image for a content recommendation system.
The post it came from was titled: "{title}" (use it only as context; describe what is actually visible).
Reply with JSON only, no other text:
{{"description": "1-2 concrete sentences about what is shown",
 "tags": ["5-10 short lowercase tags"],
 "subjects": ["main objects, animals or people"],
 "setting": "place or context",
 "style": "photo | screenshot | meme | artwork | diagram | other",
 "text": "any readable text in the image, or an empty string"}}"""

CAPTION_DONE_SQL = """
insert into content.feed_image_captions (image_id, model, status, description, tags, data, worker)
select r.image_id, %(model)s, 'done', r.description,
       coalesce(array(select jsonb_array_elements_text(r.tags)), '{}'), r.data, %(worker)s
from jsonb_to_recordset(%(rows)s::jsonb) as r(image_id uuid, description text, tags jsonb, data jsonb)
on conflict (image_id, model) do update set status = 'done', description = excluded.description, tags = excluded.tags,
  data = excluded.data, error = null, attempts = content.feed_image_captions.attempts + 1,
  worker = excluded.worker, updated_at = now()
"""


def parse_caption(raw):
    """Model output → (description, tags, data); falls back to the raw text when the JSON is broken."""
    text = re.sub(r"<think>.*?</think>", "", raw, flags=re.S).strip()
    match = re.search(r"\{.*\}", text, flags=re.S)
    data = {}
    if match:
        try:
            data = json.loads(match.group(0))
        except json.JSONDecodeError:
            data = {}
    if not isinstance(data, dict):
        data = {}
    description = str(data.get("description") or "").strip() or re.sub(r"\s+", " ", re.sub(r"[{}\[\]\"]", " ", text)).strip()[:400]
    tags = data.get("tags") if isinstance(data.get("tags"), list) else []
    tags = list(dict.fromkeys(str(t).strip().lower()[:40] for t in tags if str(t).strip()))[:12]
    if not data:
        data = {"raw": text[:1000]}
    return description[:600], tags, data


def looks_broken(raw):
    text = raw.strip()
    return len(text) < 15 or "!!!!" in text or sum(ch.isprintable() for ch in text) < 0.9 * len(text)


class Captioner:
    def __init__(self, model_id, dtype, device_map):
        from transformers import AutoModelForImageTextToText, AutoProcessor

        self.model_id = model_id
        self.processor = AutoProcessor.from_pretrained(model_id)
        self.processor.tokenizer.padding_side = "left"
        self.model = AutoModelForImageTextToText.from_pretrained(model_id, dtype=dtype, device_map=device_map).eval()
        self.dtype = dtype
        self.batch = CAPTION_BATCH or self.auto_batch()

    def auto_batch(self):
        # Decoding is memory-bound and launch-bound, so bigger batches are nearly free until memory runs out.
        # ~0.2 GB per image covers its KV cache and activations at CAPTION_MAX_SIDE; 1 GB is kept spare.
        if not torch.cuda.is_available():
            return 2
        free = torch.cuda.mem_get_info(self.model.device)[0] / 2**30
        return max(2, min(32, int((free - 1.0) / 0.2)))

    def caption(self, images, titles):
        texts = [
            self.processor.apply_chat_template(
                [{"role": "user", "content": [{"type": "image"}, {"type": "text", "text": PROMPT.format(title=t[:200].replace('"', "'"))}]}],
                tokenize=False, add_generation_prompt=True, enable_thinking=False)
            for t in titles
        ]
        inputs = self.processor(text=texts, images=images, padding=True, return_tensors="pt").to(self.model.device)
        if "pixel_values" in inputs:
            inputs["pixel_values"] = inputs["pixel_values"].to(self.dtype)
        with torch.no_grad():
            out = self.model.generate(**inputs, max_new_tokens=CAPTION_MAX_TOKENS, do_sample=False, repetition_penalty=1.05)
        return self.processor.batch_decode(out[:, inputs["input_ids"].shape[1]:], skip_special_tokens=True)


def load_captioners(probe):
    """Picks the best (model, precision) that works on these GPUs: bf16 on Ampere+ (RTX 30xx/40xx, L4, A100),
    fp16 on T4/P100 if it doesn't overflow on the probe images, else fp32 (4B split over 2 GPUs, or the 2B)."""
    gpus = torch.cuda.device_count()
    bf16 = torch.cuda.is_available() and torch.cuda.get_device_capability(0)[0] >= 8
    plans = [(CAPTION_MODEL, torch.bfloat16 if bf16 else torch.float16, "per-gpu")]
    if not bf16 and gpus >= 2:
        plans.append((CAPTION_MODEL, torch.float32, "split"))
    if not bf16:
        plans.append((FALLBACK_MODEL, torch.float32, "per-gpu"))
    for model_id, dtype, layout in plans:
        print(f"trying {model_id} in {str(dtype).replace('torch.', '')} ({layout})", flush=True)
        try:
            first = Captioner(model_id, dtype, {"": 0} if layout == "per-gpu" else "auto")
            outputs = first.caption([img for _, img, _ in probe], [t for _, _, t in probe])
            if any(looks_broken(o) for o in outputs):
                raise ValueError(f"garbled output: {outputs[0][:80]!r}")
            print(f"probe ok (batch {first.batch}): {parse_caption(outputs[0])[0][:160]}", flush=True)
        except Exception as e:  # noqa: BLE001 - overflow, OOM or garbage → next plan
            print(f"  ✗ {type(e).__name__}: {str(e)[:200]}", flush=True)
            first = None
            torch.cuda.empty_cache()
            continue
        captioners = [first]
        if layout == "per-gpu":
            for g in range(1, gpus):
                captioners.append(Captioner(model_id, dtype, {"": g}))
        return model_id, captioners
    raise RuntimeError("No captioning model worked on this GPU.")


def caption_part(captioner, part, bad):
    """Captions one batch; on CUDA OOM halves this captioner's batch size for good and retries in halves."""
    try:
        return captioner.caption([img for _, img, _ in part], [t for _, _, t in part])
    except torch.cuda.OutOfMemoryError:
        torch.cuda.empty_cache()
        if len(part) == 1:
            bad.append((part[0][0], "caption out of memory"))
            return [None]
        captioner.batch = max(1, captioner.batch // 2)
        print(f"out of GPU memory; batch size → {captioner.batch}", flush=True)
        half = len(part) // 2
        return caption_part(captioner, part[:half], bad) + caption_part(captioner, part[half:], bad)


def caption_worker(captioner, model_tag, worker, progress):
    db = Db()
    base = {"model": model_tag, "worker": worker}
    with ThreadPoolExecutor(DOWNLOAD_THREADS // 2) as pool:
        for ok, bad in prefetched(db, "feed_image_captions", model_tag, max(32, captioner.batch * 3), CAPTION_MAX_SIDE, pool, worker):
            rows = []
            i = 0
            while i < len(ok):
                part = ok[i:i + captioner.batch]
                i += len(part)
                try:
                    outputs = caption_part(captioner, part, bad)
                except Exception as e:  # noqa: BLE001 - one bad batch must not stop the run
                    bad.extend((image_id, f"caption {type(e).__name__}: {e}"[:200]) for image_id, _, _ in part)
                    continue
                for (image_id, _, _), raw in zip(part, outputs):
                    if raw is None:
                        continue
                    if looks_broken(raw):
                        bad.append((image_id, "garbled output"))
                        continue
                    description, tags, data = parse_caption(raw)
                    rows.append({"image_id": image_id, "description": description, "tags": tags, "data": data})
            if rows:
                db.run(CAPTION_DONE_SQL, {**base, "rows": json.dumps(rows)})
            if bad:
                db.run(FAILED_SQL.format(table="feed_image_captions"), {**base, "ids": [b[0] for b in bad], "errs": [b[1] for b in bad]})
            progress.add(len(rows), len(bad))


def run_captions():
    db = Db()
    model_tag = CAPTION_MODEL
    if not remaining(db, "feed_image_captions", model_tag):
        print("captions: nothing left to do")
        return
    # Two probe images decide the precision before anything is written (they are captioned again later).
    probe = []
    probe_sql = f"select i.id::text, i.image_url, coalesce(i.record->>'title', '') from content.feed_crawl_images i where {todo_filter('feed_image_captions')} order by random() limit 12"
    for image_id, url, title in db.run(probe_sql, {"model": model_tag, "retry": RETRY_FAILED, "max_attempts": MAX_ATTEMPTS}, fetch=True):
        img, _ = download(url, CAPTION_MAX_SIDE)
        if img is not None:
            probe.append((image_id, img, title))
        if len(probe) == 2:
            break
    model_tag, captioners = load_captioners(probe)
    print(f"captions with {model_tag}: {remaining(db, 'feed_image_captions', model_tag):,} images left in the pool; "
          f"{len(captioners)} worker(s) here, batch {captioners[0].batch}", flush=True)
    progress = Progress("caption", "feed_image_captions", model_tag)
    threads = [threading.Thread(target=caption_worker, args=(c, model_tag, f"{WORKER}-gpu{k}", progress)) for k, c in enumerate(captioners)]
    for t in threads:
        t.start()
    for t in threads:
        t.join()


if RUN_CAPTIONS:
    run_captions()

# %%
# ---- Status -----------------------------------------------------------------------------------
db = Db()
rows = db.run("""
select 'embeddings' as kind, model, status, count(*) from content.feed_image_embeddings group by 1, 2, 3
union all
select 'captions', model, status, count(*) from content.feed_image_captions group by 1, 2, 3
order by 1, 2, 3""", fetch=True)
total = db.run("select count(*) from content.feed_crawl_images where deleted_at is null", fetch=True)[0][0]
print(f"crawled images: {total:,}")
for kind, model, status, n in rows:
    print(f"  {kind:<10} {model:<32} {status:<6} {n:,}")
workers = db.run("""
select worker, count(*), max(updated_at) from content.feed_image_captions
where updated_at > now() - interval '15 minutes' group by 1 order by 2 desc""", fetch=True)
for worker, n, last in workers:
    print(f"  active: {worker:<40} {n:,} captions in the last 15 min")
print(f"session time: {(time.time() - STARTED) / 3600:.2f} h")
