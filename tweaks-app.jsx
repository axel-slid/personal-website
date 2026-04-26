// Tweaks app — typography controls for index.html
// Maps font selections to CSS variables on :root.

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "displayFont": "Instrument Serif",
  "bodyFont": "System Sans",
  "monoFont": "JetBrains Mono",
  "displayItalic": true,
  "displayScale": 1.0,
  "bodyScale": 1.0
}/*EDITMODE-END*/;

// Font registry — label -> css font-family stack
const DISPLAY_FONTS = {
  "Instrument Serif": '"Instrument Serif", "Iowan Old Style", Georgia, serif',
  "Newsreader":       '"Newsreader", "Iowan Old Style", Georgia, serif',
  "Fraunces":         '"Fraunces", "Iowan Old Style", Georgia, serif',
  "EB Garamond":      '"EB Garamond", "Iowan Old Style", Georgia, serif',
  "Cormorant":        '"Cormorant Garamond", "Iowan Old Style", Georgia, serif',
  "Playfair":         '"Playfair Display", "Iowan Old Style", Georgia, serif',
  "DM Serif":         '"DM Serif Display", "Iowan Old Style", Georgia, serif',
  "Space Grotesk":    '"Space Grotesk", -apple-system, BlinkMacSystemFont, sans-serif',
};

const BODY_FONTS = {
  "System Sans":   '-apple-system, BlinkMacSystemFont, "Helvetica Neue", Arial, sans-serif',
  "IBM Plex Sans": '"IBM Plex Sans", -apple-system, BlinkMacSystemFont, sans-serif',
  "Manrope":       '"Manrope", -apple-system, BlinkMacSystemFont, sans-serif',
  "Space Grotesk": '"Space Grotesk", -apple-system, BlinkMacSystemFont, sans-serif',
  "Newsreader":    '"Newsreader", Georgia, serif',
  "EB Garamond":   '"EB Garamond", Georgia, serif',
};

const MONO_FONTS = {
  "JetBrains Mono": '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  "IBM Plex Mono":  '"IBM Plex Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  "Fira Code":      '"Fira Code", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
  "Space Mono":     '"Space Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
};

function applyTypography(t) {
  const root = document.documentElement;
  root.style.setProperty("--display", DISPLAY_FONTS[t.displayFont] || DISPLAY_FONTS["Instrument Serif"]);
  root.style.setProperty("--body",    BODY_FONTS[t.bodyFont]       || BODY_FONTS["System Sans"]);
  root.style.setProperty("--mono",    MONO_FONTS[t.monoFont]       || MONO_FONTS["JetBrains Mono"]);
  // italic toggle on display headlines
  document.querySelectorAll(".masthead .name, .hero h1, .section h2, .entry h3, .pubs .title, .hero .lede, .prose p.large, .ledger .stamp b, .section .marker .num")
    .forEach((el) => { el.style.fontStyle = t.displayItalic ? "italic" : "normal"; });
  // scale
  root.style.fontSize = (17 * (t.bodyScale || 1)) + "px";
  // a quick scale variable for display sizes via CSS calc isn't trivial without rewriting clamp(), so we leave bodyScale as the lever
}

function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  React.useEffect(() => { applyTypography(t); }, [t]);

  return (
    <TweaksPanel title="Tweaks · Typography">
      <TweakSection label="Display font" />
      <TweakSelect
        label="Headlines"
        value={t.displayFont}
        options={Object.keys(DISPLAY_FONTS)}
        onChange={(v) => setTweak("displayFont", v)}
      />
      <TweakToggle
        label="Italic"
        value={t.displayItalic}
        onChange={(v) => setTweak("displayItalic", v)}
      />

      <TweakSection label="Body font" />
      <TweakSelect
        label="Paragraphs"
        value={t.bodyFont}
        options={Object.keys(BODY_FONTS)}
        onChange={(v) => setTweak("bodyFont", v)}
      />

      <TweakSection label="Mono font" />
      <TweakSelect
        label="Labels"
        value={t.monoFont}
        options={Object.keys(MONO_FONTS)}
        onChange={(v) => setTweak("monoFont", v)}
      />

      <TweakSection label="Sizing" />
      <TweakSlider
        label="Body scale"
        value={t.bodyScale}
        min={0.85}
        max={1.20}
        step={0.01}
        onChange={(v) => setTweak("bodyScale", Number(v))}
      />
    </TweaksPanel>
  );
}

ReactDOM.createRoot(document.getElementById("tweaks-root")).render(<App />);
