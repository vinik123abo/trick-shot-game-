/* מנוע הרעיונות המובנה של דייטון – עובד בלי אינטרנט ובלי מפתח API.
 * מייצר תוכנית דייט מלאה מתוך תיאור חופשי + הבחירות בטופס. */
(function () {
  "use strict";

  const CITIES = ["תל אביב", "ירושלים", "חיפה", "באר שבע", "ראשון לציון", "פתח תקווה", "נתניה", "אשדוד",
    "הרצליה", "רמת גן", "רעננה", "כפר סבא", "חולון", "רחובות", "מודיעין", "אילת", "טבריה", "נהריה",
    "עכו", "זכרון יעקב", "קיסריה", "הוד השרון", "בת ים", "אשקלון", "יפו", "גבעתיים", "ראש פינה", "צפת"];

  const TIME = {
    morning: { label: "בוקר", start: [9, 30], light: "soft golden morning light" },
    noon: { label: "צהריים", start: [12, 30], light: "bright warm afternoon sunlight" },
    evening: { label: "ערב", start: [18, 30], light: "magical golden hour sunset light turning into dusk" },
    night: { label: "לילה", start: [20, 30], light: "night time, warm string lights and city lights bokeh" },
  };

  const VIBE_LABEL = { romantic: "רומנטי", adventure: "הרפתקני", chill: "רגוע", creative: "יצירתי",
    nature: "בטבע", foodie: "קולינרי", culture: "תרבותי", home: "בבית" };

  const STAGE_LABEL = { first: "דייט ראשון", early: "דייט שני-שלישי", couple: "דייט זוגי",
    anniversary: "דייט חגיגי", surprise: "דייט הפתעה" };

  // role: open = פתיחה, main = שיא, close = סיום
  // b = רמת עלות (1 זול, 2 בינוני, 3 יקר), tm = זמנים מתאימים
  const ACTIVITIES = [
    // ---- פתיחות ----
    { id: "coffee-walk", role: "open", e: "☕", t: "קפה טוב והליכה", d: "מתחילים בבית קפה קטן ואיכותי, לוקחים את הקפה ליד ויוצאים להליכה רגועה ברחובות היפים של האזור. פותח שיחה בלי לחץ.", v: ["chill", "romantic"], tm: ["morning", "noon", "evening"], b: 1, cost: 40, place: "בית קפה שכונתי עם ישיבה בחוץ", q: "בית קפה מומלץ", img: "a couple holding coffee cups walking on a charming tree-lined street", kw: ["קפה"] },
    { id: "sunset-beach", role: "open", e: "🌅", t: "שקיעה על החוף", d: "מגיעים לחוף חצי שעה לפני השקיעה עם שמיכה ושתייה קרה. יושבים על החול, מסתכלים על השמש נכנסת לים ומדברים.", v: ["romantic", "nature", "chill"], tm: ["evening"], b: 1, cost: 30, place: "חוף ים עם נוף פתוח לשקיעה", q: "חוף ים שקיעה", img: "a couple sitting on a blanket on the beach watching the sunset over the sea", kw: ["ים", "חוף", "שקיעה"] },
    { id: "market", role: "open", e: "🧺", t: "סיבוב טעימות בשוק", d: "סיבוב בשוק המקומי עם משימה: כל אחד בוחר לשני דבר אחד לטעום. כיף, אינטראקטיבי ושובר קרח מצוין.", v: ["foodie", "adventure", "chill"], tm: ["morning", "noon"], b: 1, cost: 80, place: "השוק המקומי", q: "שוק אוכל", img: "a couple tasting street food at a colorful bustling market with fruit stalls", kw: ["שוק", "טעימות"] },
    { id: "viewpoint", role: "open", e: "🏙️", t: "תצפית על העיר", d: "עולים לנקודת תצפית גבוהה עם נוף לעיר או לים. מושלם לתמונה משותפת ולפתיחה מרשימה בלי להוציא כסף.", v: ["romantic", "nature", "chill"], tm: ["evening", "night", "noon"], b: 1, cost: 0, place: "נקודת תצפית פנורמית", q: "נקודת תצפית", img: "a couple at a scenic panoramic viewpoint overlooking the city", kw: ["תצפית", "נוף"] },
    { id: "bike", role: "open", e: "🚲", t: "רכיבה על אופניים", d: "שוכרים אופניים שיתופיים ורוכבים לאורך הטיילת או פארק גדול. קליל, ספורטיבי ומצחיק.", v: ["adventure", "nature"], tm: ["morning", "noon", "evening"], b: 1, cost: 40, place: "טיילת / פארק עם שבילי אופניים", q: "שביל אופניים פארק", img: "a happy couple riding bicycles along a seaside promenade", kw: ["אופניים", "ספורט"] },
    { id: "bookstore", role: "open", e: "📚", t: "חנות ספרים ומשחק בחירה", d: "נכנסים לחנות ספרים יד שנייה. כל אחד בוחר לשני ספר שלדעתו מתאים לו – ומסבירים למה. מגלים המון אחד על השני.", v: ["culture", "chill", "creative"], tm: ["morning", "noon", "evening"], b: 1, cost: 60, place: "חנות ספרים יד שנייה", q: "חנות ספרים יד שנייה", img: "a couple browsing books in a cozy vintage bookstore with warm lights", kw: ["ספרים", "ספר"] },
    { id: "museum", role: "open", e: "🖼️", t: "מוזיאון או גלריה", d: "ביקור קצר (שעה מקסימום) בגלריה או מוזיאון. כל אחד בוחר את היצירה האהובה עליו ומספר למה. נותן המון חומר לשיחה.", v: ["culture", "creative", "chill"], tm: ["morning", "noon", "evening"], b: 2, cost: 100, place: "מוזיאון לאמנות / גלריה", q: "מוזיאון גלריה", img: "a couple admiring paintings in a modern art gallery", kw: ["מוזיאון", "אמנות", "גלריה"] },
    { id: "wine-bar-start", role: "open", e: "🍷", t: "כוס יין בבר קטן", d: "מתחילים בבר יין אינטימי עם כוס יין ומגש גבינות קטן. אווירה בוגרת ונעימה לשיחה.", v: ["romantic", "foodie"], tm: ["evening", "night"], b: 2, cost: 150, place: "בר יין אינטימי", q: "בר יין", img: "a couple clinking wine glasses in an intimate candlelit wine bar", kw: ["יין", "בר"] },

    // ---- שיא ----
    { id: "picnic", role: "main", e: "🧺", t: "פיקניק מושקע", d: "פיקניק בפארק עם שמיכה, כריות, גבינות, פירות, לחם טרי ובקבוק יין או לימונדה. תוסיף רמקול קטן עם פלייליסט שהכנת מראש.", v: ["romantic", "nature", "chill"], tm: ["morning", "noon", "evening"], b: 1, cost: 120, place: "פארק ירוק עם דשא", q: "פארק פיקניק", img: "a beautiful romantic picnic setup on a blanket in a green park with fruits, cheese and wine", kw: ["פיקניק", "פארק"] },
    { id: "cooking-class", role: "main", e: "👩‍🍳", t: "סדנת בישול זוגית", d: "סדנת בישול (פסטה, סושי או אוכל אסייתי) – מבשלים ביחד ואוכלים את מה שהכנתם. עבודת צוות שבונה חיבור.", v: ["foodie", "creative", "adventure"], tm: ["noon", "evening"], b: 3, cost: 500, place: "סדנת בישול זוגית", q: "סדנת בישול זוגית", img: "a couple laughing while cooking pasta together in a professional cooking class kitchen", kw: ["בישול", "סדנה", "פסטה"] },
    { id: "pottery", role: "main", e: "🏺", t: "סדנת קדרות", d: "סדנת קדרות על אובניים – מלכלכים ידיים, צוחקים מהכשלונות ויוצאים עם כלי שמזכיר את הדייט.", v: ["creative", "adventure", "romantic"], tm: ["noon", "evening"], b: 3, cost: 400, place: "סטודיו לקדרות", q: "סדנת קדרות זוגית", img: "a couple making pottery together on a pottery wheel, hands covered in clay", kw: ["קדרות", "יצירה"] },
    { id: "escape", role: "main", e: "🔐", t: "חדר בריחה", d: "חדר בריחה לשניים – מגלים איך השני מתמודד עם לחץ, צוחקים ומרגישים צוות. בחר חדר ברמת קושי בינונית.", v: ["adventure", "creative"], tm: ["noon", "evening", "night"], b: 2, cost: 250, place: "חדר בריחה", q: "חדר בריחה", img: "a couple solving puzzles in a mysterious themed escape room with dramatic lighting", kw: ["חדר בריחה", "בריחה"] },
    { id: "hike", role: "main", e: "🥾", t: "מסלול טבע קצר", d: "מסלול הליכה של שעה-שעתיים עם נוף יפה, מעיין או תצפית בסוף. תביא מים, חטיפים טובים ותמונה בנקודה הכי יפה.", v: ["nature", "adventure"], tm: ["morning", "noon"], b: 1, cost: 30, place: "מסלול טבע / שמורה", q: "מסלול טבע קצר", img: "a couple hiking on a scenic nature trail with green hills and a spring", kw: ["טבע", "טיול", "מסלול", "מעיין"] },
    { id: "show", role: "main", e: "🎤", t: "הופעה חיה / סטנדאפ", d: "הופעה קטנה במועדון אינטימי או ערב סטנדאפ. צחוק משותף מקרב מהר. (בדייט ראשון – עדיף מקום שאפשר לדבר לפני ואחרי).", v: ["culture", "adventure"], tm: ["evening", "night"], b: 2, cost: 250, place: "מועדון הופעות / סטנדאפ", q: "הופעות חיות מועדון", img: "a couple enjoying a live music show in an intimate club with warm stage lights", kw: ["הופעה", "מוזיקה", "סטנדאפ", "קומדיה"] },
    { id: "kayak", role: "main", e: "🛶", t: "קיאקים / סאפ", d: "שוכרים קיאק זוגי או סאפ לשעה. ספורטיבי, מצחיק ומאוד שונה מדייט רגיל.", v: ["adventure", "nature"], tm: ["morning", "noon"], b: 2, cost: 200, place: "השכרת קיאקים / סאפ", q: "השכרת קיאק סאפ", img: "a couple paddling a kayak together on calm turquoise water", kw: ["קיאק", "סאפ", "מים"] },
    { id: "rooftop-cinema", role: "main", e: "🎬", t: "סרט באוויר הפתוח", d: "סינמטק / קולנוע פתוח או הקרנה על גג. אחרי הסרט יש ישר נושא לשיחה.", v: ["romantic", "culture", "chill"], tm: ["evening", "night"], b: 2, cost: 120, place: "קולנוע פתוח / סינמטק", q: "קולנוע פתוח סינמטק", img: "a couple watching an outdoor rooftop movie screening under string lights", kw: ["סרט", "קולנוע", "סינמה"], notFirst: true },
    { id: "paint-wine", role: "main", e: "🎨", t: "ערב ציור ויין", d: "סדנת 'ציור ויין' – כל אחד מצייר (או מנסה...) את השני. מצחיק ונשאר לכם זיכרון.", v: ["creative", "romantic"], tm: ["evening"], b: 2, cost: 300, place: "סדנת ציור ויין", q: "סדנת ציור ויין", img: "a couple painting on canvases with glasses of wine in a cozy art studio", kw: ["ציור"] },
    { id: "bowling", role: "main", e: "🎳", t: "באולינג / ביליארד", d: "ערב באולינג או ביליארד עם תחרות קטנה – המפסיד מזמין קינוח. אווירה קלילה בלי לחץ.", v: ["adventure", "chill"], tm: ["evening", "night"], b: 2, cost: 150, place: "באולינג / ביליארד", q: "באולינג", img: "a couple laughing at a retro bowling alley with neon lights", kw: ["באולינג", "ביליארד", "משחק"] },
    { id: "chef-dinner", role: "main", e: "🍽️", t: "ארוחת שף מושקעת", d: "ארוחת טעימות במסעדת שף. תזמין מקום מראש ותבקש שולחן שקט / ליד החלון. זה השיא של הערב.", v: ["romantic", "foodie"], tm: ["evening", "night"], b: 3, cost: 900, place: "מסעדת שף", q: "מסעדת שף רומנטית", img: "an elegant candlelit chef tasting dinner for two in a luxurious restaurant", kw: ["שף", "מסעדה"] },
    { id: "spa", role: "main", e: "💆", t: "ספא זוגי", d: "חבילת ספא זוגית – עיסוי, ג'קוזי ושתייה. מושלם ליום נישואין או לזוג שצריך לנוח ביחד.", v: ["romantic", "chill"], tm: ["morning", "noon", "evening"], b: 3, cost: 900, place: "ספא זוגי", q: "ספא זוגי", img: "a luxurious couples spa with candles, rose petals and a jacuzzi", kw: ["ספא", "עיסוי", "ג'קוזי"], notFirst: true },
    { id: "home-cook", role: "main", e: "🍝", t: "מבשלים ביחד בבית", d: "קונים מצרכים ביחד ומבשלים מתכון שאף אחד מכם לא עשה (פסטה טרייה, פיצה או ראמן). מוזיקה, יין ובלגן במטבח.", v: ["home", "foodie", "romantic", "creative"], tm: ["noon", "evening", "night"], b: 1, cost: 120, place: "בבית", q: "", img: "a couple cooking fresh pasta together in a cozy home kitchen with warm lights and wine", kw: ["בית", "לבשל"], home: true, notFirst: true },
    { id: "home-movie", role: "main", e: "🍿", t: "ערב סרט בבית – גרסת פרימיום", d: "בונים 'בונקר' של כריות ושמיכות בסלון, פופקורן עם תוספות, מנורות חמות וסרט שהיא בחרה. פשוט אבל עובד.", v: ["home", "chill", "romantic"], tm: ["evening", "night"], b: 1, cost: 60, place: "בבית", q: "", img: "a cozy blanket fort in a living room with fairy lights, popcorn and a movie projector", kw: ["סרט", "בית"], home: true, notFirst: true },
    { id: "stargazing", role: "main", e: "✨", t: "צפייה בכוכבים", d: "נוסעים למקום חשוך מחוץ לעיר עם שמיכה, תרמוס תה ואפליקציית כוכבים. רומנטי ברמות.", v: ["romantic", "nature", "adventure"], tm: ["night"], b: 1, cost: 50, place: "מקום חשוך מחוץ לעיר / מצפה כוכבים", q: "מצפה כוכבים", img: "a couple lying on a blanket stargazing under a milky way night sky", kw: ["כוכבים", "מדבר"] },

    // ---- סיומים ----
    { id: "dessert", role: "close", e: "🍨", t: "גלידה / קינוח והליכה", d: "מסיימים עם גלידה או קינוח טוב ועוד הליכה קצרה. סוף מתוק בלי לחץ – ואם הולך טוב, הערב ממשיך מעצמו.", v: ["chill", "romantic", "foodie"], tm: ["noon", "evening", "night"], b: 1, cost: 50, place: "גלידריה / קונדיטוריה", q: "גלידריה", img: "a couple sharing ice cream cones while walking at night with city lights", kw: ["גלידה", "קינוח"] },
    { id: "cocktail", role: "close", e: "🍸", t: "קוקטייל בבר גג", d: "סוגרים את הערב בבר על גג עם נוף, קוקטייל אחד ושיחה רגועה.", v: ["romantic", "adventure"], tm: ["evening", "night"], b: 2, cost: 160, place: "בר גג עם נוף", q: "בר גג", img: "a couple with cocktails at a stylish rooftop bar overlooking city lights at night", kw: ["קוקטייל", "בר", "גג"] },
    { id: "promenade", role: "close", e: "🌊", t: "הליכה בטיילת", d: "הליכה רגועה בטיילת לאור הירח עם רעש הגלים. רגע שקט ונעים לסיים בו.", v: ["romantic", "chill", "nature"], tm: ["evening", "night"], b: 1, cost: 0, place: "טיילת ליד הים", q: "טיילת", img: "a couple walking hand in hand along a seaside promenade at night under the moon", kw: ["טיילת", "ים"] },
    { id: "jazz", role: "close", e: "🎷", t: "בר ג'אז", d: "בר ג'אז קטן עם הופעה חיה – אווירה מושלמת לסיום ערב רומנטי.", v: ["romantic", "culture"], tm: ["night"], b: 2, cost: 180, place: "בר ג'אז עם הופעה חיה", q: "בר ג'אז הופעה חיה", img: "a couple at a dim intimate jazz bar with a live saxophone player", kw: ["ג'אז", "jazz"] },
    { id: "polaroid", role: "close", e: "📸", t: "תמונה מזכרת", d: "סיום עם תמונה משותפת במקום יפה (או מכונת תמונות). תשלח לה אותה למחרת עם הודעה קטנה.", v: ["creative", "romantic", "chill"], tm: ["morning", "noon", "evening", "night"], b: 1, cost: 20, place: "מקום יפה לתמונה", q: "", img: "a couple taking a polaroid selfie together, laughing, warm light", kw: ["תמונה"] },
    { id: "home-dessert", role: "close", e: "🫕", t: "פונדו שוקולד בבית", d: "סיר פונדו שוקולד עם תותים, בננות ומרשמלו, נרות ופלייליסט רגוע.", v: ["home", "romantic"], tm: ["evening", "night"], b: 1, cost: 60, place: "בבית", q: "", img: "chocolate fondue with strawberries and candles on a cozy home table, romantic", kw: ["שוקולד", "בית"], home: true },
    { id: "breakfast-end", role: "close", e: "🥐", t: "מאפה ומיץ טרי", d: "מסיימים במאפייה טובה עם קרואסון ומיץ טרי לדרך.", v: ["chill", "foodie"], tm: ["morning", "noon"], b: 1, cost: 50, place: "מאפייה בוטיק", q: "מאפייה בוטיק", img: "a couple sharing croissants at a sunny boutique bakery cafe", kw: ["מאפה", "קרואסון"] },
  ];

  const FOODS = [
    { id: "italian", e: "🍝", c: "איטלקי", d: "פסטה טרייה, פיצה מהטאבון ותירמיסו. אוכל נוח שכולם אוהבים – בחירה בטוחה לדייט.", v: ["romantic", "foodie", "chill"], b: 2, cost: 300, q: "מסעדה איטלקית", img: "a cozy italian trattoria with candlelight, pasta and red wine for two", kw: ["איטלקי", "פסטה", "פיצה"] },
    { id: "sushi", e: "🍣", c: "סושי / יפני", d: "סושי בר עם ישיבה ליד השף. אפשר לחלוק מגשים ולטעום הכל.", v: ["foodie", "adventure"], b: 2, cost: 350, q: "סושי בר", img: "a stylish japanese sushi bar counter with a couple and the sushi chef", kw: ["סושי", "יפני"] },
    { id: "chef", e: "🥂", c: "מסעדת שף", d: "תפריט טעימות, יין טוב ושירות מוקפד. לאירועים מיוחדים.", v: ["romantic", "foodie"], b: 3, cost: 900, q: "מסעדת שף", img: "fine dining tasting menu plates and wine glasses on an elegant candlelit table", kw: ["שף", "יוקרה", "טעימות"] },
    { id: "burger", e: "🍔", c: "המבורגר / ביסטרו", d: "המבורגריה טובה עם צ'יפס ובירה. קליל, טעים ולא מחייב – מצוין לדייט ראשון רגוע.", v: ["chill", "adventure"], b: 1, cost: 160, q: "המבורגר מומלץ", img: "a couple eating gourmet burgers and fries at a trendy bistro", kw: ["המבורגר", "בורגר"] },
    { id: "mediterranean", e: "🥙", c: "ים תיכוני / מזרחי", d: "המון מנות קטנות לחלוק – סלטים, חומוס, דגים ובשר על האש. שולחן מלא וכיף.", v: ["foodie", "chill"], b: 2, cost: 280, q: "מסעדה ים תיכונית", img: "a table full of colorful mediterranean mezze dishes shared by a couple", kw: ["מזרחי", "ים תיכוני", "חומוס"] },
    { id: "seafood", e: "🦐", c: "דגים ופירות ים על הים", d: "מסעדת דגים עם שולחן מול הים – נוף, אוכל טרי ורוח ים.", v: ["romantic", "nature", "foodie"], b: 3, cost: 500, q: "מסעדת דגים על הים", img: "a seaside seafood restaurant table at sunset with the ocean view", kw: ["דגים", "פירות ים"] },
    { id: "asian", e: "🍜", c: "אסייתי / ראמן", d: "מסעדה אסייתית צבעונית – ראמן, באו, דים סאם. מתאים למי שאוהב לטעום דברים חדשים.", v: ["adventure", "foodie", "chill"], b: 2, cost: 220, q: "מסעדה אסייתית ראמן", img: "a couple sharing ramen and dim sum at a vibrant asian restaurant with neon signs", kw: ["אסייתי", "ראמן", "תאילנדי", "סיני"] },
    { id: "streetfood", e: "🌮", c: "אוכל רחוב", d: "סיבוב בין דוכני אוכל רחוב – טאקו, סביח, פיתות. זול, כיף ואותנטי.", v: ["adventure", "chill", "foodie"], b: 1, cost: 100, q: "אוכל רחוב", img: "a couple eating tacos from a street food stand at night with festive lights", kw: ["רחוב", "טאקו", "סביח"] },
    { id: "brunch", e: "🍳", c: "בראנץ'", d: "בראנץ' עשיר בבית קפה שמח – שקשוקה, פנקייקים ומימוזה.", v: ["chill", "foodie"], b: 2, cost: 200, q: "בראנץ' מומלץ", img: "a lovely brunch table with pancakes, shakshuka and mimosas in a sunny cafe", kw: ["בראנץ'", "ארוחת בוקר"], tm: ["morning", "noon"] },
    { id: "vegan", e: "🥗", c: "טבעוני / בריא", d: "מסעדה טבעונית יצירתית – מנות צבעוניות וטעימות גם למי שלא טבעוני.", v: ["chill", "nature", "foodie"], b: 2, cost: 220, q: "מסעדה טבעונית", img: "colorful creative vegan dishes on a table in a bright green restaurant", kw: ["טבעוני", "צמחוני", "בריא"] },
    { id: "meat", e: "🥩", c: "בשרים / סטייקייה", d: "סטייקייה טובה עם נתחים איכותיים ויין אדום.", v: ["foodie", "romantic"], b: 3, cost: 600, q: "סטייקייה", img: "a romantic steakhouse dinner with steak and red wine under warm lights", kw: ["בשר", "סטייק", "סטייקייה"] },
    { id: "home-order", e: "🛵", c: "משלוח שווה הביתה", d: "מזמינים משהו מיוחד, עורכים שולחן יפה עם נרות ומפית – והופכים משלוח לארוחה.", v: ["home", "chill"], b: 1, cost: 150, q: "", img: "a beautifully set dinner table at home with candles and takeout food, cozy", kw: ["משלוח"], home: true },
  ];

  // מילות מפתח מהטקסט החופשי -> תגיות
  const KEYWORDS = [
    [/רומנט|אהבה|מיוחד/, { vibe: "romantic" }],
    [/הרפתק|אקסטרים|אדרנלין|ספורט|פעיל/, { vibe: "adventure" }],
    [/רגוע|שקט|פשוט|נינוח|קליל/, { vibe: "chill" }],
    [/יציר|אמנות|ציור|קדרות|סדנ/, { vibe: "creative" }],
    [/טבע|(?:^|[\s,.])(?:ה|ל|ב|על ה)?ים(?=$|[\s,.])|חוף|פארק|מעיין|יער|כוכבים|שקיעה|טיול/, { vibe: "nature" }],
    [/אוכל|מסעד|לאכול|טעים|שף|יין/, { vibe: "foodie" }],
    [/מוזיאון|הופע|תיאטרון|סרט|מוזיק|סטנדאפ|תרבות/, { vibe: "culture" }],
    [/בבית|בדירה|לא לצאת|גשם/, { vibe: "home" }],
    [/זול|חסכונ|תקציב נמוך|בלי כסף|לא יקר|סטודנט/, { budget: 1 }],
    [/יוקר|מפנק|לפנק|(?<!לא )יקר|לא משנה כמה|מושקע/, { budget: 3 }],
    [/דייט שני|דייט שלישי|פגישה שנייה|פגישה שלישית/, { stage: "early" }],
    [/דייט ראשון|פעם ראשונה|הכרנו|טינדר|אפליקציה/, { stage: "first" }],
    [/נישואין|יום הולדת|שנה ביחד|יום שנה|הצעת נישואין|חגיג/, { stage: "anniversary" }],
    [/הפתע/, { stage: "surprise" }],
    [/בוקר/, { time: "morning" }], [/צהריים/, { time: "noon" }],
    [/ערב|שקיעה/, { time: "evening" }], [/לילה|מאוחר/, { time: "night" }],
  ];

  const rnd = (n) => Math.floor(Math.random() * n);
  const pad = (n) => String(n).padStart(2, "0");
  const fmtTime = (mins) => `${pad(Math.floor(mins / 60) % 24)}:${pad(mins % 60)}`;

  function parseText(text) {
    const out = { vibes: [], words: [] };
    if (!text) return out;
    for (const [re, tag] of KEYWORDS) {
      if (re.test(text)) {
        if (tag.vibe) out.vibes.push(tag.vibe);
        if (tag.budget) out.budget = tag.budget;
        if (tag.stage) out.stage = tag.stage;
        if (tag.time) out.time = tag.time;
      }
    }
    for (const c of CITIES) if (text.includes(c)) { out.city = c; break; }
    out.words = text.split(/[\s,.!?]+/).filter(Boolean);
    return out;
  }

  // מילים קצרות (כמו "ים") נבדקות כמילה שלמה, כדי ש"חברים" לא ייחשב כ"ים"
  function hasWord(ctx, k) {
    if (k.length > 2) return ctx.text.includes(k);
    return ctx.words.some((w) => w === k || w.replace(/^(?:ו?(?:ה|ל|ב|מ|ש))/, "") === k);
  }

  function score(item, ctx) {
    let s = Math.random() * 2.2; // גיוון
    for (const v of ctx.vibes) if (item.v.includes(v)) s += 3;
    if (item.kw) for (const k of item.kw) if (hasWord(ctx, k)) s += 6;
    if (item.b > ctx.budget) s -= 6 * (item.b - ctx.budget);
    if (ctx.budget === 3 && item.b === 3) s += 2;
    if (ctx.isHome && !item.home && item.role !== "close") s -= 20;
    if (!ctx.isHome && item.home) s -= 20;
    if (ctx.stage === "first" && item.notFirst) s -= 8;
    if (ctx.stage === "first" && item.b === 3) s -= 2;
    if ((ctx.stage === "anniversary" || ctx.stage === "surprise") && item.v.includes("romantic")) s += 2;
    if (item.tm && !item.tm.includes(ctx.time)) s -= 15;
    if (ctx.exclude.has(item.id)) s -= 100;
    return s;
  }

  function pick(list, ctx) {
    return list.map((it) => [score(it, ctx), it]).sort((a, b) => b[0] - a[0])[0][1];
  }

  function topN(list, ctx, n) {
    return list.map((it) => [score(it, ctx), it]).sort((a, b) => b[0] - a[0]).slice(0, n).map((x) => x[1]);
  }

  function mapsUrl(q, city) {
    const query = [q, city].filter(Boolean).join(" ");
    return query ? "https://www.google.com/maps/search/" + encodeURIComponent(query) : "";
  }

  function imagePrompt(scene, ctx) {
    return `cinematic photograph, ${scene}, ${TIME[ctx.time].light}, ${ctx.vibes.includes("romantic") ? "romantic warm atmosphere," : ""} beautiful composition, shallow depth of field, high detail, 35mm film look`;
  }

  const TIPS_BY_STAGE = {
    first: ["תשאיר את הדייט קצר – שעתיים-שלוש. עדיף שהיא תרצה עוד.", "מקום ציבורי ונוח להגיע אליו. תציע לה לבחור אם להגיע לבד.", "תשאל שאלות פתוחות ותקשיב באמת – אל תעשה ראיון עבודה.", "הטלפון בכיס, על שקט."],
    early: ["תזכיר משהו שהיא סיפרה בדייט הקודם – זה מראה שהקשבת.", "זה הזמן להעז קצת יותר: פעילות משותפת במקום רק לשבת.", "תהיה ברור שאתה נהנה – בלי משחקים."],
    couple: ["תכנן את הכל מראש – הקסם הוא שהיא לא צריכה לחשוב על כלום.", "נסו משהו שלא עשיתם אף פעם ביחד.", "בלי שיחות על עבודה, חשבונות וסידורים הערב."],
    anniversary: ["הזמנת מקום מראש היא חובה. תבקש שולחן מיוחד.", "פתק בכתב יד או מתנה קטנה ואישית שווים יותר ממתנה יקרה.", "תעלה זיכרון מהדייט הראשון שלכם – תמיד עובד."],
    surprise: ["תגיד לה רק מה ללבוש ומתי להיות מוכנה – את השאר תשאיר בהפתעה.", "תוודא שאין לה התחייבויות באותו יום (תתייעץ בשקט עם חברה שלה).", "תכין תוכנית גיבוי למקרה של מזג אוויר."],
  };

  const STARTERS = [
    "מה הדבר הכי ספונטני שעשית אי פעם?", "אם היית יכולה לגור שנה בכל מקום בעולם – איפה?",
    "מה הדבר שהכי משמח אותך ביום רגיל?", "איזה מאכל מזכיר לך את הילדות?",
    "מה היה הטיול הכי טוב שלך?", "מה משהו שתמיד רצית ללמוד ועוד לא יצא?",
    "איזה שיר את שומעת בלופ לאחרונה?", "מה הכי מצחיק אותך?", "איך נראה יום מושלם בשבילך מההתחלה עד הסוף?",
    "יש לך הרגל מוזר שאף אחד לא יודע עליו?", "מה הסדרה האחרונה שלא הצלחת להפסיק?",
  ];

  const OUTFIT = {
    adventure: "נוח ומוכן לתנועה: ג'ינס או מכנסי צ'ינו, טישרט / חולצה פשוטה ונקייה, סניקרס נקיות. תביא שכבה נוספת לערב.",
    nature: "בגדים נוחים ונעליים סגורות להליכה, כובע ומשקפי שמש. תביא שמיכה ובקבוק מים גם בשבילה.",
    home: "לא טרנינג מוכתם 😉 – ג'ינס נוח וחולצה נקייה, ריח טוב. הבית מסודר ונקי, נרות ותאורה חמה.",
    fancy: "מכנסיים מחויטים או צ'ינו כהה, חולצה מכופתרת מגוהצת, נעלי עור / סניקרס עור נקיות, ובושם עדין.",
    default: "ג'ינס כהה, חולצה מכופתרת או טישרט איכותית, סניקרס נקיות. פשוט, מסודר וריח טוב.",
  };

  const PRO_MOVES = [
    "תכין פלייליסט קטן של 10 שירים 'של הדייט' ותשלח לה אותו למחרת.",
    "תביא פרח אחד (לא זר ענק) – מחווה קטנה שעושה רושם גדול.",
    "תשאל אותה מראש אם יש משהו שהיא לא אוכלת – זה מראה שאכפת לך.",
    "תשלח הודעה קצרה כשהיא מגיעה הביתה: 'היה לי ממש כיף היום'.",
    "תזמין מקום מראש ותגיע 5 דקות לפני – אין דבר מרגיע יותר מגבר שמתכנן.",
    "תכין לה פתק קטן ותחביא אותו בתיק / במעיל שלה.",
  ];

  function buildPlanOffline(input) {
    const parsed = parseText((input.freeText || "") + " " + (input.herLikes || ""));
    const vibes = [...new Set([...(input.vibes || []), ...parsed.vibes])];
    const ctx = {
      text: (input.freeText || "") + " " + (input.herLikes || ""),
      vibes: vibes.length ? vibes : ["romantic", "chill"],
      budget: Number(parsed.budget || input.budget || 2),
      stage: parsed.stage || input.stage || "first",
      time: parsed.time || input.time || "evening",
      city: input.city || parsed.city || "",
      exclude: new Set(input.exclude || []),
      words: parsed.words,
    };
    ctx.isHome = ctx.vibes.includes("home") && ctx.vibes.length <= 2 || /בבית|בדירה|לא לצאת/.test(ctx.text);

    // בחירת פעילויות
    const opens = ACTIVITIES.filter((a) => a.role === "open");
    const mains = ACTIVITIES.filter((a) => a.role === "main");
    const closes = ACTIVITIES.filter((a) => a.role === "close");

    const main = pick(mains, ctx);
    ctx.exclude.add(main.id);
    const foodCtx = Object.assign({}, ctx, { exclude: new Set() });
    const foods = topN(FOODS, foodCtx, 3);
    const food = foods[0];
    const mainIsMeal = main.id === "chef-dinner" || main.id === "cooking-class" || main.id === "home-cook" || main.id === "picnic";

    const steps = [];
    if (!ctx.isHome) {
      const open = pick(opens, ctx);
      ctx.exclude.add(open.id);
      steps.push({ a: open, dur: 60 });
    }
    steps.push({ a: main, dur: main.cost > 300 ? 120 : 90 });
    if (!mainIsMeal) {
      steps.push({
        a: { e: food.e, t: `ארוחה: ${food.c}`, d: food.d, cost: food.cost, place: `מסעדה – ${food.c}`, q: food.q, img: food.img, home: food.home },
        dur: 75,
      });
    }
    // בדייט ראשון שומרים על זה קצר – עד 3 תחנות
    if (!(ctx.stage === "first" && steps.length >= 3) && (ctx.stage !== "first" || ctx.time !== "morning")) {
      const close = pick(closes, ctx);
      steps.push({ a: close, dur: 45 });
    }

    let t = TIME[ctx.time].start[0] * 60 + TIME[ctx.time].start[1];
    const timeline = steps.map(({ a, dur }) => {
      const item = {
        time: fmtTime(t),
        _id: a.id,
        emoji: a.e,
        title: a.t,
        description: a.d,
        place_name: a.place,
        maps_url: a.home ? "" : mapsUrl(a.q, ctx.city),
        cost: a.cost,
        image_prompt: imagePrompt(a.img, ctx),
      };
      t += dur + 15;
      return item;
    });

    const total = timeline.reduce((s, x) => s + (x.cost || 0), 0);
    const hours = Math.max(1, Math.round((t - (TIME[ctx.time].start[0] * 60 + TIME[ctx.time].start[1])) / 30) / 2);

    const restaurants = foods.map((f) => ({
      name: `${f.e} ${f.c}`,
      why: f.d,
      price: "₪".repeat(f.b) + ` · כ-${f.cost} ₪ לזוג`,
      maps_url: f.home ? "" : mapsUrl(f.q + (ctx.vibes.includes("romantic") ? " רומנטית" : ""), ctx.city),
    }));

    const vibeText = ctx.vibes.map((v) => VIBE_LABEL[v]).filter(Boolean).join(" · ");
    const titles = {
      romantic: ["ערב של פרפרים בבטן", "רומנטיקה בלי מאמץ", "הדייט שהיא תספר עליו לחברות"],
      adventure: ["הרפתקה לשניים", "דייט עם אדרנלין", "יוצאים מאזור הנוחות"],
      chill: ["דייט נינוח וכיפי", "פשוט, טעים ונעים", "בלי לחץ, רק כיף"],
      creative: ["יוצרים ביחד", "דייט עם ידיים מלוכלכות", "ערב יצירתי לשניים"],
      nature: ["אוויר פתוח ולב פתוח", "דייט בטבע", "רק אתם והנוף"],
      foodie: ["מסע טעמים לשניים", "דייט לאוהבי אוכל", "הדרך ללב עוברת בקיבה"],
      culture: ["ערב תרבות ושיחות", "דייט עם השראה", "קצת תרבות, הרבה כימיה"],
      home: ["דייט בבית – גרסת חמישה כוכבים", "הבית הופך למסעדה", "ערב חמים בבית"],
    };
    const tl = titles[ctx.vibes[0]] || titles.romantic;

    const fancy = ctx.budget === 3 || ctx.stage === "anniversary";
    const outfit = ctx.isHome ? OUTFIT.home : fancy ? OUTFIT.fancy : ctx.vibes.includes("adventure") ? OUTFIT.adventure : ctx.vibes.includes("nature") ? OUTFIT.nature : OUTFIT.default;

    const starters = [...STARTERS].sort(() => Math.random() - 0.5).slice(0, 4);
    const tips = [...(TIPS_BY_STAGE[ctx.stage] || TIPS_BY_STAGE.first)];
    if (input.herLikes) tips.unshift(`שלב משהו ממה שהיא אוהבת (${input.herLikes}) – אפילו פרט קטן יראה לה שהקשבת.`);

    return {
      title: tl[rnd(tl.length)],
      summary: `${STAGE_LABEL[ctx.stage]} ב${TIME[ctx.time].label}${ctx.city ? " ב" + ctx.city : ""}: ${timeline.map((x) => x.title).join(" ← ")}.`,
      vibe_label: vibeText,
      duration: `כ-${hours} שעות`,
      budget_estimate: total === 0 ? "כמעט בחינם" : `כ-${Math.round(total / 10) * 10} ₪ לזוג`,
      image_prompt: imagePrompt(`a happy young couple on a date, ${main.img}`, ctx),
      timeline,
      restaurants,
      outfit,
      tips,
      conversation_starters: starters,
      backup_plan: ctx.isHome
        ? "אם משהו לא מסתדר במטבח – מזמינים משלוח שווה וממשיכים עם הערב. העיקר האווירה."
        : main.v.includes("nature") || steps.some((s) => s.a.v && s.a.v.includes("nature"))
          ? "אם יורד גשם או חם מדי: מחליפים את החלק בחוץ בבית קפה מפנק או בחדר בריחה, ושומרים את הארוחה כמו שהיא."
          : "אם המקום מלא או סגור – שמור בטלפון מקום חלופי קרוב באותו סגנון. תבדוק שעות פתיחה ותזמין מראש.",
      pro_move: PRO_MOVES[rnd(PRO_MOVES.length)],
      city: ctx.city,
      _source: "offline",
    };
  }

  const QUICK_IDEAS = [
    { e: "🌅", t: "שקיעה ופיקניק", s: "זול ורומנטי", text: "פיקניק רומנטי על החוף בשקיעה, לא יקר", vibes: ["romantic", "nature"], budget: 1, time: "evening" },
    { e: "🍝", t: "פסטה ויין", s: "קלאסיקה איטלקית", text: "ערב רומנטי עם אוכל איטלקי ויין", vibes: ["romantic", "foodie"], budget: 2, time: "evening" },
    { e: "🔐", t: "חדר בריחה ובורגר", s: "שובר קרח לדייט ראשון", text: "דייט ראשון כיפי עם חדר בריחה ובורגר", vibes: ["adventure"], budget: 2, time: "evening", stage: "first" },
    { e: "🏺", t: "סדנת קדרות", s: "יצירתי ושונה", text: "דייט יצירתי עם סדנה", vibes: ["creative"], budget: 3, time: "noon" },
    { e: "🥾", t: "מסלול ומעיין", s: "הרפתקה בטבע", text: "טיול טבע עם מעיין ופיקניק", vibes: ["nature", "adventure"], budget: 1, time: "morning" },
    { e: "🍿", t: "סרט בבית – פרימיום", s: "חורף, שמיכה, פופקורן", text: "דייט בבית בערב חורפי, סרט ושוקולד", vibes: ["home", "chill"], budget: 1, time: "night", stage: "couple" },
    { e: "🥂", t: "יום נישואין", s: "ארוחת שף ובר גג", text: "יום נישואין מפנק עם מסעדת שף", vibes: ["romantic", "foodie"], budget: 3, time: "evening", stage: "anniversary" },
    { e: "☕", t: "קפה ושוק", s: "דייט בוקר קליל", text: "דייט בוקר רגוע עם קפה וסיבוב בשוק", vibes: ["chill", "foodie"], budget: 1, time: "morning" },
    { e: "✨", t: "כוכבים במדבר", s: "לילה בלתי נשכח", text: "לילה רומנטי של צפייה בכוכבים", vibes: ["romantic", "nature", "adventure"], budget: 1, time: "night", stage: "couple" },
    { e: "🎤", t: "סטנדאפ ובר", s: "צחוק משותף", text: "ערב סטנדאפ וקוקטייל", vibes: ["culture", "adventure"], budget: 2, time: "night" },
  ];

  window.DateIdeas = { CITIES, QUICK_IDEAS, TIME, VIBE_LABEL, STAGE_LABEL, buildPlanOffline, mapsUrl };
})();
