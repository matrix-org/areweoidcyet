import cx from "classnames";

import matrix from "./matrix-logo-white.svg";
import are from "./are.txt?raw";
import we from "./we.txt?raw";
import oidc from "./oidc.txt?raw";
import yet from "./yet.txt?raw";
import styles from "./style.module.css";

const AsciiLogo = () => (
  <div className={cx(styles.container, "cpd-theme-dark")}>
    <div className={styles.ascii} aria-label="Are we OIDC yet?">
      <pre className={styles.part}>{are}</pre>
      <pre className={styles.part}>{we}</pre>
      <pre className={styles.part}>{oidc}</pre>
      <pre className={styles.part}>{yet}</pre>
    </div>
    <div className={styles.head}>
      <a href="https://matrix.org/">
        <img
          alt="Matrix"
          src={matrix.src}
          height={matrix.height}
          width={matrix.width}
        />
      </a>
      <div>Last updated: 2026-01-30</div>
    </div>
  </div>
);

export default AsciiLogo;
