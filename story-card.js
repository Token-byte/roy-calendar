'use strict';
/* Fonts the 9:16 Wrapped card draws with. The files are in the service-worker shell. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.StoryCard = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const FONT_FILES = [
    'fonts/anton-400.woff2',
    'fonts/varela-round-hebrew-400.woff2',
    'fonts/varela-round-latin-400.woff2'
  ];
  function requiredFontLoads(){
    return [
      '400 13px "Anton"',
      '400 92px "Anton"',
      '400 16px "Varela Round"',
      '400 28px "Varela Round"',
      '700 34px "Varela Round"'
    ];
  }
  return { FONT_FILES, requiredFontLoads };
});
