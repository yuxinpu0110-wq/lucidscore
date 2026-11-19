# UI performance changes

2026-11-16: existing PlaybackClock already publishes semantic boundaries, not every media frame; PlaybackProgress paints its own DOM at up to30Hz. This release preserves that design.

- GuideText is memoized with a stable, current reference handler; unchanged paragraphs no longer re-tokenize on every parent/bar render. MovementNav has a semantic prop comparator and stable callback, while its settings remain live. ScoreViewport compares actual scene geometry/preload URLs rather than new array identities.
- Mobile backdrop filters are disabled except the fixed player (8px). Large review backdrops use opaque translucent color. Score lens retains transform-based movement and loses mobile backdrop filtering. The static score ink SVG filter remains so theme-aware transparent notation is preserved.
- Camera viewBox/aspect ratio snap once per viewport change, replacing300ms of per-frame SVG layout. The measure lens and page crossfade retain transform/opacity transitions. Credit movement uses translate3d rather than animated top; logo breathing uses opacity rather than animated filter.
- IntroPrologue cleanup captures its actual video node, pauses it, removes src and calls load before release. It still unmounts on skip/entry.
- Score decoding promises are bounded to4 entries (was48), use async decode, and prefetch adjacent regions on both sides. SVG scans keep explicit911x1232 intrinsic geometry; initial viewport reserves crop aspect ratio. Ordinary ScoreImage uses lazy/async loading and measured intrinsic dimensions from scoreImageSizes.json.
- Touch targets use manipulation; reading panels use contained overscroll and iOS momentum scrolling. Mobile score still scrolls normally with the page.
- Content and vendor bundles are split for caching. Entry JS is about137kB instead of1.67MB. HLS remains599kB; the explicit chunk warning budget is650KiB to accommodate this existing lazy dependency, rather than claiming the library shrank. Total first-load bytes are not reduced in proportion to the entry chunk.

Validation:86 unit tests, build without warnings, production size limits, prologue/font/route browser regressions. scripts/check-ui-performance.mjs measured one1s playing interval at4x CPU throttle:0 top-level render marks, no large mobile blur surfaces; Tab automation roundtrip about278ms (includes Playwright overhead, not input-to-paint latency). Video is detached, paused and has no src after skip. No claim of physical-device60fps or80% GPU savings; iPhone Safari profiling remains needed.

Highlights is available in both local and production builds. Its playback loop runs while the tour is active.
