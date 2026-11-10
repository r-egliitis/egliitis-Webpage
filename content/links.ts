type Links = {
  email: string;
  github: string;
  linkedin: string | null;
  instagram: string | null;
};

export const links: Links = {
  email: "roberts.egliitis@gmail.com",
  github: "https://github.com/r-egliitis",
  linkedin: "https://www.linkedin.com/in/roberts-egl%C4%ABtis-11b265411/",
  instagram: "https://www.instagram.com/r.egliitis/",
};

export function mailto(subject: string) {
  return `mailto:${links.email}?subject=${encodeURIComponent(subject)}`;
}
