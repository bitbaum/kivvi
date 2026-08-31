// TS 6 (TS2882) checks side-effect imports like `import './globals.css'`,
// which Next's bundled types do not declare. Declare plain CSS modules so
// the type checker accepts what the bundler already handles.
declare module "*.css";
