// Library build entry: pulls the CSS in so it is emitted as dist/v1/ds.css.
// In dev, ds.css and ds.ts are served separately (see vite.config.ts).
import './ds.css';

export * from './ds';
