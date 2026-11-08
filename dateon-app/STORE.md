# 📲 דייטון בחנויות – מדריך העלאה

התיקייה הזו (`dateon-app`) היא האפליקציה ל-iPhone ול-Android. היא נבנית מאותו קוד כמו האתר (`date-planner`), ואת הבנייה עושה GitHub בענן.

---

## ✅ מה כבר מוכן

| מה | איפה |
|---|---|
| פרויקט iPhone (Xcode) | `dateon-app/ios` |
| פרויקט Android | `dateon-app/android` |
| אייקונים ומסך פתיחה בכל הגדלים | נוצרו מ-`dateon-app/assets` |
| יכולות מהמכשיר (Native) | רטט אמיתי, שיתוף של המערכת, תזכורות לדייט כהתראות, שורת סטטוס לפי הערכה |
| הרשאות עם הסבר בעברית | תמונות, מצלמה, מיקום, התראות |
| בנייה אוטומטית ל-Android | GitHub Actions ← **Dateon Android** (בכל דחיפה) |
| בנייה והעלאה ל-App Store | GitHub Actions ← **Dateon iOS** (אחרי הגדרת מפתח של אפל) |
| מדיניות פרטיות | https://vinik123abo.github.io/trick-shot-game-/date-planner/privacy-policy.html |
| צילומי מסך לחנויות | `dateon-app/store/ios` (‏1290×2796) ו-`dateon-app/store/android` (‏1080×2340) |
| אייקון 1024 לאפל | `dateon-app/assets/icon-only.png` |

**מזהה האפליקציה (Bundle ID / Package):** `io.github.vinik123abo.dateon`

---

## 🟦 Samsung Galaxy Store

### 1. חשבון מוכר (חינם)
נרשמים ב-https://seller.samsungapps.com עם חשבון Samsung. בוחרים חשבון "פרטי" (Individual), אלא אם יש לך עוסק או חברה.

### 2. מפתח חתימה – פעם אחת לכל החיים ⚠️
כל עדכון של האפליקציה חייב להיחתם באותו מפתח. **אם המפתח הולך לאיבוד, אי אפשר יותר לעדכן את האפליקציה.**
במחשב שמותקנת בו Java מריצים:

```
keytool -genkeypair -v -keystore dateon.keystore -alias dateon -keyalg RSA -keysize 2048 -validity 10000
```

אחר כך שומרים את הקובץ `dateon.keystore` ואת הסיסמה **בשני מקומות בטוחים**, למשל בענן ועל דיסק און קי.

### 3. מוסרים את המפתח ל-GitHub (בצורה מוצפנת)
בריפו: **Settings ← Secrets and variables ← Actions ← New repository secret**, ומוסיפים:

| שם | ערך |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | תוכן הקובץ בקידוד base64. ב-Mac/Linux: `base64 -i dateon.keystore`. ב-Windows (PowerShell): `[Convert]::ToBase64String([IO.File]::ReadAllBytes("dateon.keystore"))` |
| `ANDROID_KEYSTORE_PASSWORD` | הסיסמה של הקובץ |
| `ANDROID_KEY_ALIAS` | `dateon` |
| `ANDROID_KEY_PASSWORD` | סיסמת המפתח (בדרך כלל זהה לסיסמה של הקובץ) |

### 4. בנייה
**Actions ← Dateon Android ← Run workflow.** בסוף הריצה, תחת **Artifacts**, יש קובץ zip ובו:
- `dateon-test-XX.apk` – להתקנה ישירה על הטלפון שלך לבדיקה.
- `app-release.apk` – **הקובץ שמעלים לגלקסי סטור** (חתום).
- `app-release.aab` – לגוגל פליי, אם תרצה גם שם.

### 5. העלאה
ב-Seller Portal: **Add New Application ← Android**:
- **Binary:** את `app-release.apk`.
- **שם:** דייטון · **קטגוריה:** Lifestyle.
- **תיאור, צילומי מסך, אייקון 512:** כל הטקסטים בהמשך המדריך. צילומי המסך נמצאים ב-`store/android`.
- **מדיניות פרטיות:** הקישור מהטבלה למעלה.
- **דירוג גיל:** ממלאים את השאלון. התשובות המתאימות נמצאות בהמשך.
- **מדינות:** ישראל (ואפשר להוסיף עוד).

הבדיקה של סמסונג לוקחת בדרך כלל כמה ימים.

---

## 🍎 Apple App Store

### 1. חשבון מפתח (‎$99 לשנה)
נרשמים ב-https://developer.apple.com/programs/enroll. צריך Apple ID עם אימות דו-שלבי.
- **פרטי:** האפליקציה תופיע בחנות תחת השם המלא שלך.
- **חברה:** צריך מספר D-U-N-S, ואז יופיע שם החברה.

### 2. יצירת האפליקציה ב-App Store Connect
1. **Certificates, Identifiers & Profiles ← Identifiers ← +**: יוצרים App ID עם המזהה `io.github.vinik123abo.dateon`.
2. **App Store Connect ← Apps ← + New App**:
   - פלטפורמה iOS.
   - שם: **דייטון – מתכנן דייטים** (אם השם תפוס, מנסים "דייטון: תכנון דייט").
   - שפה ראשית: Hebrew.
   - Bundle ID: מה שיצרת בשלב הקודם.
   - SKU: `dateon`.

### 3. מפתח API – כדי ש-GitHub יבנה ויעלה בשבילך (בלי Mac)
**App Store Connect ← Users and Access ← Integrations ← App Store Connect API ← Generate API Key**, עם הרשאת **App Manager**. מורידים את קובץ ה-`.p8` (אפשר להוריד אותו רק פעם אחת).

ב-GitHub Secrets מוסיפים:

| שם | ערך |
|---|---|
| `ASC_KEY_ID` | ה-Key ID |
| `ASC_ISSUER_ID` | ה-Issuer ID (מופיע מעל רשימת המפתחות) |
| `ASC_KEY_P8` | **כל התוכן** של קובץ ה-.p8, כולל השורות BEGIN/END |
| `APPLE_TEAM_ID` | ה-Team ID, מ-developer.apple.com ← Membership |

### 4. בנייה והעלאה
**Actions ← Dateon iOS ← Run workflow.** GitHub בונה על Mac בענן, חותם ומעלה ל-App Store Connect.
אחרי כ-15–30 דקות הבנייה מופיעה ב-**TestFlight**. מתקינים את אפליקציית TestFlight באייפון ובודקים את דייטון.

> 💡 בריפו ציבורי הבנייה בחינם. בריפו פרטי דקות של Mac נספרות פי 10 מהמכסה החינמית של GitHub, וכל בנייה לוקחת בערך 10–15 דקות.

### 5. שליחה לבדיקה
בדף הגרסה ב-App Store Connect:
- **צילומי מסך:** מ-`store/ios`, בגודל 6.9 אינץ'.
- **טקסטים:** מהמשך המדריך.
- **Privacy Policy URL:** הקישור למעלה.
- **App Privacy:** בוחרים **Data Not Collected**. אנחנו לא שומרים כלום, והכול נשאר במכשיר.
- **Age Rating:** התשובות בהמשך.
- **Build:** בוחרים את הבנייה מ-TestFlight ולוחצים **Submit for Review**.
- **הערות לבודק (App Review Notes):** אין צורך בהתחברות. מומלץ לכתוב:
  > No login required. Tap "בוא נתכנן דייט" → "בנה לי את הדייט" to generate a plan. The 🎡 tab has the date wheel; the 💌 tab has the countdown (schedules local notifications) and the invitation card (native share sheet).

הבדיקה של אפל לוקחת בדרך כלל 1–3 ימים.

---

## 📝 טקסטים לחנויות

### עברית
- **שם (עד 30 תווים):** דייטון – מתכנן דייטים
- **כותרת משנה (עד 30):** הדייט המושלם, מתוכנן בשבילך
- **טקסט קידום (עד 170):** כותבים במילים פשוטות איזה דייט רוצים ומקבלים תוכנית מלאה: מקומות אמיתיים, אוכל, לו״ז, טיפים, כרטיס הזמנה מעוצב וספירה לאחור 💘
- **מילות מפתח (עד 100, מופרדות בפסיקים בלי רווחים):** דייט,דייטים,רעיונות לדייט,זוגיות,רומנטי,מסעדות,דייט ראשון,יום נישואין,הפתעה,כשר
- **תיאור:**

```
לא יודע לתכנן דייט? דייטון עושה את זה בשבילך 💘

כותבים במילים פשוטות מה בא לכם – "דייט שני, היא אוהבת ים ואוכל איטלקי, משהו רומנטי ולא יקר בתל אביב" – ומקבלים תוכנית מלאה ומוכנה:

✨ לו״ז שלב אחרי שלב עם מקומות אמיתיים בעיר שלכם
🍝 איפה לאכול – לפי תקציב, אווירה וכשרות
📍 מעל 130 מקומות לדייט ב-17 ערים ואזורים: חופים, טבע, תצפיות, מסעדות, ברים ופרחים – כולל "קרוב אליי"
🏠 דייטים בבית עם רשימת קניות מוכנה
💐 איזה זר להביא ומתי לתת אותו
🎡 גלגל דייטים, החלקת רעיונות ומבחן "איזה דייט מתאים לכם"
💌 כרטיס הזמנה מעוצב ב-13 סגנונות – עם התמונה והשמות שלכם
⏳ ספירה לאחור לדייט עם תזכורות
🎨 6 ערכות צבעים + סגנון משלכם, וצלילים מוזיקליים לבחירה

🔒 פרטיות מלאה: בלי הרשמה, בלי פרסומות, והכל נשמר רק במכשיר שלכם.
```

### English
- **Name:** Dateon – Date Planner
- **Subtitle:** Your perfect date, planned
- **Promotional text:** Describe the date you want in plain words and get a full plan: real places, food, a timeline, tips, a designed invitation and a countdown 💘
- **Keywords:** date,date ideas,date night,romantic,couple,restaurants,first date,anniversary,surprise,kosher

---

## 🔞 דירוג גיל (Apple ו-Samsung/IARC)
- **אלכוהול:** יש אזכורים מתונים ונדירים (יין, קוקטיילים, בר). עונים **Infrequent/Mild**.
- **כל שאר הקטגוריות:** None / No. זה כולל אלימות, תוכן מיני, הימורים, תוכן שמשתמשים מעלים וצ'אט.
- **רכישות בתוך האפליקציה:** אין. **פרסומות:** אין.
- **התוצאה הצפויה:** דירוג 12+/13+.

---

## 🔄 עדכונים
האפליקציה מהחנות מכילה עותק של הקוד, ולכן שינויים באתר **לא** מתעדכנים בה לבד. אחרי שינוי:
- **Android:** מריצים שוב את **Dateon Android** ומעלים את ה-APK החדש. מספר הגרסה עולה אוטומטית.
- **iPhone:** מריצים **Dateon iOS** ושולחים את הבנייה החדשה לבדיקה. מספר הבנייה עולה אוטומטית.

## 🛠️ עבודה מקומית (לא חובה)
```
cd dateon-app
npm ci
npm run sync          # מעתיק את date-planner לאפליקציה ומסנכרן את iOS ו-Android
npx cap open android  # Android Studio
npx cap open ios      # Xcode (רק ב-Mac)
```
