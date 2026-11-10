import type { Dictionary } from "@/content/en";

export const lv: Dictionary = {
  meta: {
    title: "egliitis",
    description:
      "Roberts Eglītis – starptautiskā biznesa students no Latvijas, kas apvieno programmēšanu, dizainu un mākslu ar biznesu.",
  },
  a11y: {
    mainNav: "Galvenā navigācija",
    languageSwitch: "Izvēlēties valodu",
    themeToggle: "Pārslēgt krāsu tēmu",
  },
  nav: {
    about: "Par mani",
    background: "Izglītība",
    skills: "Prasmes",
    now: "Tagad",
    contact: "Kontakti",
  },
  hero: {
    label: "Starptautiskā biznesa un ilgtspējīgas ekonomikas students Rīgas Stradiņa universitātē",
    name: "Roberts Eglītis",
    headline: "Bizness × Dizains × Tehnoloģijas",
    subline:
      "Es apvienoju programmēšanu un tehnoloģijas ar dizainu un mākslu – un tagad apgūstu arī biznesa pusi.",
    location: "Latvija",
    primaryButton: "Radīsim kaut ko kopā",
    secondaryButton: "Vairāk par mani",
  },
  about: {
    heading: "Par mani",
    paragraphs: [
      'Es esmu Roberts – pēc izglītības programmētājs, pēc būtības mākslinieks. Esmu mācījies programmēšanu Rīgas Valsts tehnikumā un vizuāli plastisko mākslu Ropažu Mūzikas un mākslas skolā "Rodenpois".',
      "Tagad studēju starptautisko biznesu un ilgtspējīgu ekonomiku Rīgas Stradiņa universitātē. Mans mērķis ir izveidot savu biznesu un pašam veidot savus projektus, kā arī saprast, kā manas intereses savienojas cita ar citu un ar plašāko pasauli.",
      "Šobrīd esmu atvērts jebkam, kas palīdz atrast to, kas ir patiesi mans. Ja tev ir ideja, problēma vai projekts – labprāt par to uzzināšu.",
    ],
    interestsLabel: "Mani interesē",
    interests: [
      "Cilvēku vienošana",
      "Produktu un jaunuzņēmumu veidošana",
      "Dizains un vizuālā stāstīšana",
      "Kā tehnoloģijas un MI maina darba veidu",
    ],
  },
  background: {
    heading: "Izglītība",
    intro: "Trīs skolas, trīs domāšanas veidi.",
    items: [
      {
        years: "2026 – tagad",
        school: "Rīgas Stradiņa universitāte (RSU)",
        field: 'Bakalaura programma "Starptautiskais bizness un ilgtspējīga ekonomika"',
        detail: "1. kurss",
        icon: "business",
      },
      {
        // TODO: add the start year at Rīgas Valsts tehnikums ("[START YEAR] – 2026").
        years: "2026",
        school: "Rīgas Valsts tehnikums",
        field: "Programmēšana",
        detail: "Profesionālās vidējās izglītības diploms, kvalifikācija: programmēšanas tehniķis",
        icon: "code",
      },
      {
        // TODO: add the start year at Rodenpois ("[START YEAR] – 2020").
        years: "2020",
        school: 'Ropažu Mūzikas un mākslas skola "Rodenpois"',
        field: "Vizuāli plastiskā māksla",
        detail: "Profesionālās ievirzes izglītības apliecība",
        icon: "art",
      },
    ],
  },
  skills: {
    heading: "Prasmes",
    intro: "Rīki, ar kuriem esmu strādājis programmēšanā, dizainā un 3D.",
    rows: [
      {
        label: "Valodas",
        items: ["HTML", "CSS", "JavaScript", "TypeScript", "Python", "PHP", "SQL", "C#", "Java", "C++"],
      },
      {
        label: "Ietvari",
        items: ["React", "Next.js", "Vue.js", "Nuxt.js", "Laravel", "React Native", "Tailwind CSS"],
      },
      {
        label: "Dizains",
        items: ["Figma", "Photoshop", "Illustrator", "Foto apstrāde", "Video montāža"],
      },
      {
        label: "Māksla un 3D",
        items: ["Zīmēšana", "Gleznošana", "Blender", "SketchUp"],
      },
      {
        label: "Rīki",
        items: ["Git", "GitHub", "Vercel"],
      },
    ],
  },
  now: {
    heading: "Tagad",
    label: "Šobrīd veidoju",
    title: "Kaut ko grupām, kas liek Latvijai kopā dziedāt, dejot un spēlēt.",
    body: "Kori, tautas deju kolektīvi un sporta komandas tiekas katru nedēļu, gadu no gada. Pētu, kā padarīt to vadīšanu vienkāršāku, lai vairāk laika paliktu tam, ko viņi mīl. Drīzumā vairāk.",
    status: "Posms: ideja un izpēte",
    link: "Vadi grupu? Pastāsti, kā tu to dari.",
    emailSubject: "Grupas vadītājs – egliitis.id.lv",
  },
  contact: {
    heading: "Radīsim kaut ko kopā",
    body: "Tev ir ideja, problēma vai projekts? Esmu atvērts sadarbībai visdažādākajās jomās – uzraksti, un parunāsim.",
    mainButton: "Uzraksti man",
    emailSubject: "Sveiks no egliitis.id.lv",
    linkedinButton: "Sazināties LinkedIn",
    footer: "© 2026 Roberts Eglītis",
    footerNote: "Veidots ar Next.js un MI rīkiem, mitināts Vercel.",
  },
};
