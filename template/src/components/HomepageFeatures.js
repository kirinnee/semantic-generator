import React from 'react';
import { features } from './features';
import styles from './HomepageFeatures.module.css';
import clsx from 'clsx';

function Feature({ Svg, title, desc }) {
  return (
    <div className={clsx('col col--4')}>
      <div className="text--center">
        <Svg className={styles.featureSvg} alt={title} />
      </div>
      <div className="text--center padding-horiz--md">
        <h3>{title}</h3>
        <p>{desc}</p>
      </div>
    </div>
  );
}


export default function HomepageFeatures() {

  return (
    <section className={styles.features}>
      <div className="container">
        <div className={`row ${styles.jcenter}`} >
          {features.map((props, idx) => (
            <Feature key={idx} {...props} />
          ))}
        </div>
      </div>
    </section>
  );
}
