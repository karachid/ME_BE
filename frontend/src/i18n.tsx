import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { extra } from "./i18n-extra";

export type Lang = "ar" | "fr";

const base = {
  ar: {
    appName: "MenuXpert",
    login: "تسجيل الدخول",
    email: "البريد الإلكتروني",
    password: "كلمة المرور",
    loginError: "البريد الإلكتروني أو كلمة المرور غير صحيحة",
    tooMany: "محاولات كثيرة، حاول لاحقاً",
    networkError: "تعذر الاتصال بالخادم",
    logout: "خروج",
    search: "بحث عن منتج...",
    all: "الكل",
    addItem: "إضافة منتج",
    editItem: "تعديل المنتج",
    qrMenu: "رمز QR",
    available: "متوفر",
    soldOut: "غير متوفر",
    price: "السعر",
    discount: "تخفيض",
    discountTitle: "تخفيض على المنتج",
    percent: "نسبة %",
    fixed: "مبلغ",
    value: "القيمة",
    schedule: "تحديد فترة",
    from: "من",
    to: "إلى",
    newPrice: "السعر بعد التخفيض",
    save: "حفظ",
    cancel: "إلغاء",
    remove: "حذف",
    removeDiscount: "إلغاء التخفيض",
    delete: "حذف",
    confirmDelete: "هل تريد حذف هذا المنتج؟",
    name: "الاسم",
    description: "الوصف",
    category: "الفئة",
    newCategory: "فئة جديدة",
    addCategory: "إضافة فئة",
    imageUrl: "رابط الصورة (اختياري)",
    noItems: "لا توجد منتجات",
    saved: "تم الحفظ",
    scheduled: "مبرمج",
    expired: "منتهي",
    currency: "د.م.",
    copyLink: "نسخ الرابط",
    copied: "تم النسخ",
    print: "طباعة",
    back: "رجوع",
    qrHelp: "اطبع هذا الرمز وضعه على الطاولات. الزبائن يرون قائمتك المحدّثة دائماً.",
    menuNotFound: "القائمة غير موجودة",
    loading: "...جارٍ التحميل",
    sessionExpired: "انتهت الجلسة، سجّل الدخول من جديد",
    nameRequired: "الاسم مطلوب",
    priceInvalid: "السعر غير صحيح",
    categoryRequired: "اختر فئة",
    tagline: "أدِر قائمتك في ثوانٍ",
    loginSubtitle: "سجّل الدخول لإدارة قائمة مطعمك",
    manageHint: "غيّر الأسعار، أوقف المنتجات، وأطلق العروض فوراً.",
    statTotal: "المنتجات",
    statPromo: "عروض",
    edit: "تعديل",
    noResults: "لا نتائج لهذا البحث",
    openMenu: "عرض قائمة الزبائن",
    offers: "عروض اليوم",
    searchMenu: "ابحث في القائمة",
    poweredBy: "بدعم من",
    itemsCount: "منتج",
    yourMenu: "قائمتك",
    scanToOrder: "امسح الرمز لعرض القائمة",
    saveError: "تعذر الحفظ",
    deleted: "تم الحذف",
    stockHint: "اضغط على المفتاح لإيقاف منتج",
    localWarning: "هذا العنوان يعمل فقط على هذا الحاسوب. الهاتف لن يفتح الرمز. أدخل عنوان الشبكة (مثال: http://192.168.1.20:5173) أو افتح لوحة التحكم من ذلك العنوان.",
    publicAddress: "العنوان الذي يفتحه الزبائن",
    reset: "إعادة ضبط",
  },
  fr: {
    appName: "MenuXpert",
    login: "Connexion",
    email: "E-mail",
    password: "Mot de passe",
    loginError: "E-mail ou mot de passe incorrect",
    tooMany: "Trop de tentatives, réessayez plus tard",
    networkError: "Impossible de joindre le serveur",
    logout: "Quitter",
    search: "Rechercher un produit...",
    all: "Tout",
    addItem: "Ajouter un produit",
    editItem: "Modifier le produit",
    qrMenu: "QR code",
    available: "Disponible",
    soldOut: "Épuisé",
    price: "Prix",
    discount: "Promo",
    discountTitle: "Promotion sur le produit",
    percent: "Pourcentage %",
    fixed: "Montant",
    value: "Valeur",
    schedule: "Programmer une période",
    from: "Du",
    to: "Au",
    newPrice: "Prix après promo",
    save: "Enregistrer",
    cancel: "Annuler",
    remove: "Supprimer",
    removeDiscount: "Retirer la promo",
    delete: "Supprimer",
    confirmDelete: "Supprimer ce produit ?",
    name: "Nom",
    description: "Description",
    category: "Catégorie",
    newCategory: "Nouvelle catégorie",
    addCategory: "Ajouter une catégorie",
    imageUrl: "Lien de l'image (optionnel)",
    noItems: "Aucun produit",
    saved: "Enregistré",
    scheduled: "Programmée",
    expired: "Terminée",
    currency: "DH",
    copyLink: "Copier le lien",
    copied: "Copié",
    print: "Imprimer",
    back: "Retour",
    qrHelp:
      "Imprimez ce code et placez-le sur les tables. Vos clients voient toujours le menu à jour.",
    menuNotFound: "Menu introuvable",
    loading: "Chargement...",
    sessionExpired: "Session expirée, reconnectez-vous",
    nameRequired: "Le nom est obligatoire",
    priceInvalid: "Prix invalide",
    categoryRequired: "Choisissez une catégorie",
    tagline: "Gérez votre menu en quelques secondes",
    loginSubtitle: "Connectez-vous pour gérer le menu de votre établissement",
    manageHint: "Changez les prix, désactivez un produit, lancez une promo en un geste.",
    statTotal: "Produits",
    statPromo: "Promos",
    edit: "Modifier",
    noResults: "Aucun résultat pour cette recherche",
    openMenu: "Voir le menu client",
    offers: "Offres du moment",
    searchMenu: "Rechercher dans le menu",
    poweredBy: "Propulsé par",
    itemsCount: "produits",
    yourMenu: "Votre menu",
    scanToOrder: "Scannez pour voir le menu",
    saveError: "Échec de l'enregistrement",
    deleted: "Supprimé",
    stockHint: "Utilisez l'interrupteur pour désactiver un produit",
    localWarning: "Cette adresse ne fonctionne que sur cet ordinateur : un téléphone ne pourra pas ouvrir le QR code. Saisissez l'adresse réseau (ex. http://192.168.1.20:5173) ou ouvrez le tableau de bord depuis cette adresse.",
    publicAddress: "Adresse ouverte par les clients",
    reset: "Réinitialiser",
  },
} as const;

const dict = {
  ar: { ...base.ar, ...extra.ar },
  fr: { ...base.fr, ...extra.fr },
} as const;

export type TKey = keyof (typeof dict)["fr"];

interface I18n {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TKey) => string;
  /** t() with {placeholders} filled in. */
  tf: (key: TKey, vars: Record<string, string | number>) => string;
  money: (value: number) => string;
}

const Ctx = createContext<I18n | null>(null);
const LANG_KEY = "mx_lang";

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(LANG_KEY);
    if (saved === "ar" || saved === "fr") return saved;
  } catch {
    /* ignore */
  }
  return "ar"; // Arabic is the primary language
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    try {
      localStorage.setItem(LANG_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback((key: TKey) => dict[lang][key] as string, [lang]);
  const tf = useCallback(
    (key: TKey, vars: Record<string, string | number>) => {
      let template = dict[lang][key] as string;
      // French: "1 produits" -> "1 produit"
      if (lang === "fr" && vars.n === 1) {
        template = template
          .replace(/produits/g, "produit")
          .replace(/catégories/g, "catégorie")
          .replace(/épuisés/g, "épuisé")
          .replace(/terminées/g, "terminée")
          .replace(/promos/g, "promo");
      }
      return Object.entries(vars).reduce(
        (text, [k, v]) => text.split(`{${k}}`).join(String(v)),
        template,
      );
    },
    [lang],
  );
  const money = useCallback(
    (value: number) =>
      `${Number.isInteger(value) ? value : value.toFixed(2)} ${dict[lang].currency}`,
    [lang],
  );

  return <Ctx.Provider value={{ lang, setLang, t, tf, money }}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n outside I18nProvider");
  return ctx;
}
