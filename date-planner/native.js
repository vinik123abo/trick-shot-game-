// דייטון – חיבור ליכולות של האפליקציה המותקנת מהחנות (iOS / Android, דרך Capacitor).
// באתר הרגיל הקובץ לא עושה כלום.
const C = window.Capacitor;
const isNative = !!(C && typeof C.isNativePlatform === "function" && C.isNativePlatform());
const api = { native: isNative, platform: isNative ? C.getPlatform() : "web" };
window.DateonNative = api;

if (isNative) {
  document.documentElement.classList.add("native", "native-" + api.platform);
  const { registerPlugin } = await import("./vendor/capacitor-core.js");
  const Haptics = registerPlugin("Haptics");
  const Share = registerPlugin("Share");
  const Filesystem = registerPlugin("Filesystem");
  const LocalNotifications = registerPlugin("LocalNotifications");
  const StatusBar = registerPlugin("StatusBar");

  // רטט אמיתי של הטלפון (גם באייפון, שבו רטט מהדפדפן לא קיים)
  api.haptic = (pattern) => {
    const ms = Array.isArray(pattern) ? pattern.reduce((a, b) => a + b, 0) : Number(pattern) || 10;
    const style = ms >= 40 ? "HEAVY" : ms >= 18 ? "MEDIUM" : "LIGHT";
    Haptics.impact({ style }).catch(() => {});
    return true;
  };

  // שיתוף תמונה + טקסט דרך תפריט השיתוף של המערכת (וואטסאפ, שמירה לגלריה...)
  api.shareImage = async (dataUrl, text, name = "image.png") => {
    const r = await Filesystem.writeFile({ path: name, data: dataUrl.split(",")[1], directory: "CACHE" });
    await Share.share({ text, files: [r.uri], dialogTitle: "שליחה" });
    return true;
  };
  api.shareText = async (text) => { await Share.share({ text, dialogTitle: "שליחה" }); return true; };

  // תזכורות לדייט: יום לפני, שעתיים לפני ובזמן
  const IDS = [101, 102, 103];
  api.scheduleDate = async (cd) => {
    try {
      const perm = await LocalNotifications.requestPermissions();
      if (perm.display !== "granted") return false;
      await LocalNotifications.cancel({ notifications: IDS.map((id) => ({ id })) }).catch(() => {});
      const at = new Date(cd.when).getTime();
      const items = [
        [101, at - 24 * 3600e3, "מחר הדייט! 💘", `${cd.title || "הדייט שלכם"} – מחר. הזמנת מקום? 😉`],
        [102, at - 2 * 3600e3, "עוד שעתיים לדייט ⏳", `${cd.title || "הדייט שלכם"}${cd.place ? " · " + cd.place : ""}`],
        [103, at, "הגיע הזמן! 💘", "תהנו ❤️"],
      ].filter(([, t]) => t > Date.now() + 60e3).map(([id, t, title, body]) => ({ id, title, body, schedule: { at: new Date(t) } }));
      if (items.length) await LocalNotifications.schedule({ notifications: items });
      return items.length > 0;
    } catch { return false; }
  };
  api.cancelDate = () => LocalNotifications.cancel({ notifications: IDS.map((id) => ({ id })) }).catch(() => {});

  // שורת הסטטוס (שעון/סוללה) – טקסט בהיר בערכות כהות וכהה בערכה הבהירה
  let lastBar = null;
  const paintBar = () => {
    const light = document.documentElement.dataset.theme === "pastel" ||
      (document.documentElement.style.getPropertyValue("color-scheme") || "").trim() === "light";
    const style = light ? "LIGHT" : "DARK";
    if (style === lastBar) return;
    lastBar = style;
    StatusBar.setStyle({ style }).catch(() => {});
  };
  new MutationObserver(paintBar).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "style"] });
  paintBar();
}
