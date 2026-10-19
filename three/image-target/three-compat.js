// MindAR 1.2.5 imports `sRGBEncoding`, which three.js removed in r162. The
// import map sends MindAR's own `import ... from 'three'` here instead: the
// real three.js, plus the old constant (its value from three r161).
export * from 'three';
export const sRGBEncoding = 3001;
