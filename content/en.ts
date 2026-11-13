export type Dictionary = {
  meta: {
    title: string;
    description: string;
  };
  a11y: {
    mainNav: string;
    languageSwitch: string;
    themeToggle: string;
    osLink: string;
  };
  nav: {
    about: string;
    background: string;
    skills: string;
    now: string;
    contact: string;
  };
  hero: {
    label: string;
    name: string;
    headline: string;
    subline: string;
    location: string;
    primaryButton: string;
    secondaryButton: string;
  };
  about: {
    heading: string;
    paragraphs: string[];
    interestsLabel: string;
    interests: string[];
  };
  background: {
    heading: string;
    intro: string;
    items: {
      years: string;
      school: string;
      field: string;
      detail: string;
      icon: "business" | "code" | "art";
    }[];
  };
  skills: {
    heading: string;
    intro: string;
    rows: {
      label: string;
      items: string[];
    }[];
  };
  now: {
    heading: string;
    label: string;
    title: string;
    body: string;
    status: string;
    link: string;
    emailSubject: string;
  };
  contact: {
    heading: string;
    body: string;
    mainButton: string;
    emailSubject: string;
    linkedinButton: string;
    footer: string;
    footerNote: string;
  };
};

export const en: Dictionary = {
  meta: {
    title: "egliitis",
    description:
      "Roberts Eglītis – International Business student from Latvia connecting programming, design and art with business.",
  },
  a11y: {
    mainNav: "Main navigation",
    languageSwitch: "Choose language",
    themeToggle: "Toggle color theme",
    osLink: "Open private OS",
  },
  nav: {
    about: "About",
    background: "Background",
    skills: "Skills",
    now: "Now",
    contact: "Contact",
  },
  hero: {
    label: "International Business and Sustainable Economy student at RSU",
    name: "Roberts Eglītis",
    headline: "Business × Design × Tech",
    subline:
      "I connect programming and technology with design and art – and I'm now adding the business side.",
    location: "Latvia",
    primaryButton: "Let's work on something together",
    secondaryButton: "More about me",
  },
  about: {
    heading: "About",
    paragraphs: [
      "I'm Roberts – a programmer by training and an artist at heart. I studied programming at Rīga State Technical School and visual arts at Rodenpois music and art school in Ropaži.",
      "Now I'm studying International Business and Sustainable Economy at Rīga Strādiņš University. My goal is to build my own business and shape my own ventures, and to understand how my interests connect with each other and with the wider world.",
      "Right now I'm open to anything that helps me find what's truly mine. If you have an idea, a problem or a project, I'd love to hear about it.",
    ],
    interestsLabel: "I'm interested in",
    interests: [
      "Bringing people together",
      "Building products and startups",
      "Design and visual storytelling",
      "How tech and AI change the way we work",
    ],
  },
  background: {
    heading: "Background",
    intro: "Three schools, three ways of thinking.",
    items: [
      {
        years: "2026 – now",
        school: "Rīga Strādiņš University (RSU)",
        field: "Bachelor's programme in International Business and Sustainable Economy",
        detail: "1st year",
        icon: "business",
      },
      {
        // TODO: add the start year at Rīga State Technical School ("[START YEAR] – 2026").
        years: "2026",
        school: "Rīga State Technical School",
        field: "Programming",
        detail: "Vocational secondary education diploma, qualification: Programming Technician",
        icon: "code",
      },
      {
        // TODO: add the start year at Rodenpois ("[START YEAR] – 2020").
        years: "2020",
        school: 'Ropaži Music and Art School "Rodenpois"',
        field: "Visual and Plastic Arts",
        detail: "Certificate of vocational-oriented education",
        icon: "art",
      },
    ],
  },
  skills: {
    heading: "Skills",
    intro: "Tools I've worked with across code, design and 3D.",
    rows: [
      {
        label: "Languages",
        items: ["HTML", "CSS", "JavaScript", "TypeScript", "Python", "PHP", "SQL", "C#", "Java", "C++"],
      },
      {
        label: "Frameworks",
        items: ["React", "Next.js", "Vue.js", "Nuxt.js", "Laravel", "React Native", "Tailwind CSS"],
      },
      {
        label: "Design",
        items: ["Figma", "Photoshop", "Illustrator", "Photo editing", "Video editing"],
      },
      {
        label: "Art and 3D",
        items: ["Drawing", "Painting", "Blender", "SketchUp"],
      },
      {
        label: "Tools",
        items: ["Git", "GitHub", "Vercel"],
      },
    ],
  },
  now: {
    heading: "Now",
    label: "Currently building",
    title: "Something for the groups that keep Latvia singing, dancing and playing together.",
    body: "Choirs, folk dance groups and sports teams meet every week, year after year. I'm exploring how to make running them simpler, so more of their time goes into what they love. More soon.",
    status: "Stage: idea and research",
    link: "Lead a group? Tell me how you run it.",
    emailSubject: "Group leader – egliitis.id.lv",
  },
  contact: {
    heading: "Let's work on something together",
    body: "Have an idea, a problem or a project? I'm open to collaborating on all kinds of things – write to me and let's talk.",
    mainButton: "Write to me",
    emailSubject: "Hello from egliitis.id.lv",
    linkedinButton: "Connect on LinkedIn",
    footer: "© 2026 Roberts Eglītis",
    footerNote: "Built with Next.js and AI tools, hosted on Vercel.",
  },
};
