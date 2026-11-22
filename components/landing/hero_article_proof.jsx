import styles from "./hero_article_proof.module.css";

// "Launching a multilingual product update" from the demo data the playground below loads (supabase/demo/fixtures.json), with its author under the playground's cast name.
const LOCALES = [
  ["EN", true],
  ["HI", false],
  ["FR", false],
];

// Hero artwork: a printed proof of an entry in review, with the reviewer's open comment footnoted against the line it's about.
export default function HeroArticleProof() {
  return (
    <div className={styles.scene} aria-hidden="true">
      <div className={styles.paper}>
        <div className={styles.sheet}>
          <div className={styles.head}>
            <span>Article · In review</span>
            <span className={styles.locales}>
              {LOCALES.map(([code, done]) => (
                <span key={code} data-done={done || undefined}>{code}</span>
              ))}
            </span>
          </div>
          <div className={styles.title}>Launching a multilingual product update</div>
          <p className={styles.body}>
            Start by documenting the reader&apos;s question, <mark>connect the relevant guide</mark><sup>1</sup>, and
            check the proposed call to action with the reviewer.
          </p>
          <p className={styles.note}>
            <sup>1</sup>Could we add a concrete example and link the related guide before the next review?
          </p>
          <div className={styles.foot}>
            <span>Maya Chen · 4 min read</span>
            <span>Due in 5 days</span>
          </div>
        </div>
      </div>
    </div>
  );
}
