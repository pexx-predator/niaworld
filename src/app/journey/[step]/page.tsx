
import Link from "next/link";
import { notFound } from "next/navigation";

export const instant = false;

type JourneySection = {
  eyebrow: string;
  title: string;
  paragraphs: string[];
  image: string;
  imageAlt: string;
};

type JourneyPage = {
  number: string;
  label: string;
  title: string;
  accent: string;
  description: string;
  heroImage: string;
  heroAlt: string;
  introTitle: string;
  introParagraphs: string[];
  principles: {
    number: string;
    title: string;
    description: string;
  }[];
  sections: JourneySection[];
  closingTitle: string;
  closingText: string;
  primaryLabel: string;
  primaryHref: string;
  related: {
    title: string;
    description: string;
    href: string;
  }[];
};

const pages: Record<string, JourneyPage> = {
  explore: {
    number: "01",
    label: "YOUR JOURNEY",
    title: "Explore the world.",
    accent: "Follow your curiosity.",
    description:
      "Travel through cultures, traditions, places, food, languages, and everyday experiences. You do not need a passport to begin discovering the world.",
    heroImage:
      "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=2000&q=85",
    heroAlt: "A traveller exploring a destination with a sense of curiosity",
    introTitle: "Every discovery begins with a question.",
    introParagraphs: [
      "What does breakfast look like in another part of the world? Why do certain communities celebrate a particular festival? How does a familiar landscape shape the lives of the people who call it home? Exploration begins when we allow ourselves to ask questions like these.",
      "NiaWorld brings cultural topics together in one welcoming place. You can start with something familiar, follow an unexpected interest, or explore a part of the world you have always wanted to understand. Each topic is an invitation to look closer and learn beyond the first impression.",
      "The goal is not to collect places or treat cultures like items on a checklist. It is to develop a richer understanding of people, places, and the many different ways human life can unfold."
    ],
    principles: [
      {
        number: "01",
        title: "Follow an interest",
        description:
          "Begin with food, music, language, heritage, travel, or ordinary daily life. There is no single correct starting point."
      },
      {
        number: "02",
        title: "Look beyond appearances",
        description:
          "Explore the history, context, and personal meaning that can sit behind a custom, place, or cultural practice."
      },
      {
        number: "03",
        title: "Keep discovering",
        description:
          "Let one question lead to another. The more perspectives you encounter, the more there is to understand."
      }
    ],
    sections: [
      {
        eyebrow: "EXPLORE THROUGH FOOD",
        title: "A meal can tell a remarkable story.",
        paragraphs: [
          "Ingredients, cooking methods, and shared meals often reflect a place's geography, history, trade, family life, and creativity. A dish may be connected to a celebration, a daily routine, a local harvest, or a memory passed between generations.",
          "Explore food as more than a list of recipes. Ask who prepares it, when it is served, what it means to the people who enjoy it, and how the same ingredient can become something entirely different in another kitchen."
        ],
        image:
          "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=85",
        imageAlt: "A colourful selection of food ready to be shared"
      },
      {
        eyebrow: "EXPLORE THROUGH PLACE",
        title: "Understand places through the people who live there.",
        paragraphs: [
          "A destination is more than a view. Neighbourhoods, markets, farms, coastlines, cities, and villages all have stories shaped by the people who live and work there.",
          "Look for local perspectives alongside scenery. Everyday routines, community knowledge, and personal experiences can reveal details that a quick visit or photograph might miss."
        ],
        image:
          "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=85",
        imageAlt: "A dramatic mountain landscape"
      },
      {
        eyebrow: "EXPLORE THROUGH EXPRESSION",
        title: "Listen, look, and learn in new ways.",
        paragraphs: [
          "Music, visual art, dance, storytelling, and language can communicate ideas that are difficult to capture in a short description. They can carry humour, memory, identity, celebration, and change.",
          "Approach creative work with curiosity. Learn about the people who make it, the setting in which it is shared, and the meaning its creators want others to understand."
        ],
        image:
          "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1200&q=85",
        imageAlt: "Colourful artwork in an artist's workspace"
      }
    ],
    closingTitle: "Let curiosity choose your next destination.",
    closingText:
      "Choose a cultural topic below and continue exploring. Each category opens a more focused look at the stories, practices, and experiences that make our world diverse.",
    primaryLabel: "Browse cultural categories",
    primaryHref: "/#categories",
    related: [
      {
        title: "Food & Flavours",
        description: "Discover dishes, ingredients, recipes, and food traditions.",
        href: "/explore/food-flavours"
      },
      {
        title: "Places & Travel",
        description: "Explore destinations, landscapes, and local perspectives.",
        href: "/explore/places-travel"
      },
      {
        title: "Culture & Heritage",
        description: "Learn about customs, celebrations, and living heritage.",
        href: "/explore/culture-heritage"
      }
    ]
  },

  discover: {
    number: "02",
    label: "GO A LITTLE DEEPER",
    title: "Discover the meaning.",
    accent: "Look beyond the familiar.",
    description:
      "Go beyond first impressions to understand the stories, knowledge, traditions, and experiences that give culture its depth and meaning.",
    heroImage:
      "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=2000&q=85",
    heroAlt: "People learning and exchanging ideas",
    introTitle: "Seeing something is only the beginning.",
    introParagraphs: [
      "A photograph can introduce a tradition. A song can spark a question. A greeting can reveal a different way of expressing respect. But meaningful discovery begins when we move beyond what we see and try to understand why something matters to the people involved.",
      "NiaWorld encourages thoughtful learning rather than quick assumptions. Cultural practices often have histories, regional variations, personal meanings, and contemporary interpretations. One person's experience can be valuable without representing every person from a country or community.",
      "Approach every discovery with an open mind. Ask respectful questions, seek context, compare perspectives carefully, and be willing to update what you thought you knew."
    ],
    principles: [
      {
        number: "01",
        title: "Ask thoughtful questions",
        description:
          "Explore why a practice exists, how it has changed, and what it means to people who take part in it."
      },
      {
        number: "02",
        title: "Seek context",
        description:
          "History, geography, language, family life, and changing social conditions can all help explain a cultural experience."
      },
      {
        number: "03",
        title: "Make room for differences",
        description:
          "People within the same community may have different beliefs, memories, preferences, and relationships with a tradition."
      }
    ],
    sections: [
      {
        eyebrow: "DISCOVER TRADITIONS",
        title: "Understand the meaning behind a custom.",
        paragraphs: [
          "Traditions can mark important life events, express belonging, honour ancestors, welcome guests, or bring a community together. Their meaning may be connected to a particular time, place, family, or belief.",
          "Rather than assuming every tradition has one fixed explanation, explore who practises it, how participants describe its meaning, and how it may differ between generations or communities."
        ],
        image:
          "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=1200&q=85",
        imageAlt: "A lively public celebration"
      },
      {
        eyebrow: "DISCOVER PERSPECTIVES",
        title: "Listen to experiences that differ from your own.",
        paragraphs: [
          "Personal experiences offer a valuable view of daily life, but they are not automatically universal. One person's memories can open a door to understanding while also reminding us to keep learning from other voices.",
          "Look for accounts that explain their own context. Pay attention to differences within communities, and avoid turning a single experience into a claim about an entire nation or culture."
        ],
        image:
          "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=85",
        imageAlt: "A group of people spending time together"
      },
      {
        eyebrow: "DISCOVER CHANGE",
        title: "Culture is alive, not frozen in time.",
        paragraphs: [
          "Communities adapt as people move, generations change, technologies develop, and new ideas meet established practices. Traditions can be preserved, reinterpreted, debated, or combined with influences from elsewhere.",
          "Learning about culture today means noticing both continuity and change. It means respecting heritage while recognising that people shape their identities in many different ways."
        ],
        image:
          "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1200&q=85",
        imageAlt: "Artworks showing different forms of creative expression"
      }
    ],
    closingTitle: "Stay curious. Leave room to learn.",
    closingText:
      "Choose a topic and continue your discovery. NiaWorld's category pages provide a starting point for exploring cultural subjects in more detail.",
    primaryLabel: "Explore cultural topics",
    primaryHref: "/#categories",
    related: [
      {
        title: "Culture & Heritage",
        description: "Explore customs, celebrations, and living traditions.",
        href: "/explore/culture-heritage"
      },
      {
        title: "Languages",
        description: "Discover expressions, meanings, and ways of communicating.",
        href: "/explore/languages"
      },
      {
        title: "Everyday Life",
        description: "Learn about routines, work, family, and community.",
        href: "/explore/everyday-life"
      }
    ]
  },

  connect: {
    number: "03",
    label: "PEOPLE BEFORE DISTANCE",
    title: "Connection starts here.",
    accent: "Every perspective matters.",
    description:
      "Culture becomes more meaningful when people exchange experiences, listen to one another, and discover what they share without ignoring what makes them different.",
    heroImage:
      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=2000&q=85",
    heroAlt: "People sharing time and conversation together",
    introTitle: "The most meaningful discoveries are often human.",
    introParagraphs: [
      "Reading about another place can teach us a great deal. Listening to someone explain what that place means to them can add a different kind of understanding. Conversations help us see how culture is experienced in real lives, not just described in general terms.",
      "NiaWorld's vision for connection is a welcoming space where people can exchange perspectives, ask respectful questions, discuss interests, and learn from experiences beyond their own. Connection does not require everyone to agree. It requires people to treat one another with dignity and curiosity.",
      "This page introduces the principles that should guide cultural exchange on NiaWorld. Community accounts, direct messaging, and member profiles require their own product features and will need to be implemented before they can be used as live services."
    ],
    principles: [
      {
        number: "01",
        title: "Listen with respect",
        description:
          "Give people room to describe their own experiences without assuming you already know what their lives are like."
      },
      {
        number: "02",
        title: "Find shared interests",
        description:
          "Food, language, music, travel, family stories, art, and everyday experiences can all become starting points for conversation."
      },
      {
        number: "03",
        title: "Respect boundaries",
        description:
          "Healthy cultural exchange includes consent, privacy, respectful disagreement, and the freedom not to answer a question."
      }
    ],
    sections: [
      {
        eyebrow: "START WITH CURIOSITY",
        title: "A good question can open a new perspective.",
        paragraphs: [
          "Questions can help people explain the things they value, the experiences that shaped them, or the traditions they enjoy. Open questions such as 'What does this celebration mean to you?' leave room for a personal answer.",
          "Avoid treating one person as a spokesperson for an entire country or group. Invite their perspective as their own, and recognise that someone else may have a different experience."
        ],
        image:
          "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1200&q=85",
        imageAlt: "People gathering and interacting in a social setting"
      },
      {
        eyebrow: "BUILD MUTUAL UNDERSTANDING",
        title: "Exchange stories without ranking cultures.",
        paragraphs: [
          "Cultural exchange works best when people share without being pressured to prove that their traditions are better or more interesting than someone else's. Every community has its own context, complexity, strengths, and challenges.",
          "A respectful exchange can include curiosity, disagreement, humour, and new ideas. The goal is not to erase differences but to understand them more thoughtfully."
        ],
        image:
          "https://images.unsplash.com/photo-1528605248644-14dd04022da1?auto=format&fit=crop&w=1200&q=85",
        imageAlt: "People sharing a meal around a table"
      },
      {
        eyebrow: "MAKE ROOM FOR EVERYONE",
        title: "Belonging begins with how people are treated.",
        paragraphs: [
          "A welcoming community needs clear expectations. People should be able to share their experiences without harassment, pressure to reveal private information, or disrespect directed at their identity or background.",
          "As NiaWorld's community features are developed, the experience should include practical ways to manage privacy, report abuse, moderate content, and set expectations for respectful participation."
        ],
        image:
          "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=85",
        imageAlt: "Friends enjoying a shared experience"
      }
    ],
    closingTitle: "Build understanding, one conversation at a time.",
    closingText:
      "Start by exploring the topics that interest you. The current site introduces the community vision; live member accounts and messaging can be added as dedicated features.",
    primaryLabel: "Explore community stories",
    primaryHref: "/explore/everyday-life",
    related: [
      {
        title: "Everyday Life",
        description: "Discover the routines and experiences that shape daily life.",
        href: "/explore/everyday-life"
      },
      {
        title: "Languages",
        description: "Explore the words and expressions that bring people together.",
        href: "/explore/languages"
      },
      {
        title: "Food & Flavours",
        description: "Start conversations around food and shared traditions.",
        href: "/explore/food-flavours"
      }
    ]
  },

  share: {
    number: "04",
    label: "YOUR STORY BELONGS",
    title: "Share your world.",
    accent: "Your perspective matters.",
    description:
      "A family recipe, a local expression, a celebration, a memory, or an everyday ritual can help someone else see the world from a new perspective.",
    heroImage:
      "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=2000&q=85",
    heroAlt: "A notebook ready for a personal story",
    introTitle: "You do not need to be an expert to have a story.",
    introParagraphs: [
      "Some cultural stories are found in archives and museums. Others live in the small details of everyday life: the phrase a grandparent uses, the meal a family prepares together, the music heard during a celebration, or the way neighbours welcome one another.",
      "NiaWorld's sharing vision is to give people a thoughtful way to introduce others to their experiences. A contribution can be personal and simple. What matters is that it is shared honestly, with care for the people and traditions it describes.",
      "This page helps you prepare a meaningful contribution. The live submission, publishing, photo upload, and moderation features must be built separately before visitors can publish directly to the platform."
    ],
    principles: [
      {
        number: "01",
        title: "Choose a story you know",
        description:
          "Start with an experience, tradition, place, recipe, expression, or memory you can describe in your own words."
      },
      {
        number: "02",
        title: "Add the context",
        description:
          "Explain where the story comes from, why it matters to you, and whether it reflects your own experience or information you learned elsewhere."
      },
      {
        number: "03",
        title: "Share responsibly",
        description:
          "Respect other people's privacy, seek permission before sharing their images or personal stories, and credit sources when appropriate."
      }
    ],
    sections: [
      {
        eyebrow: "SHARE A TRADITION",
        title: "Tell people what makes it meaningful.",
        paragraphs: [
          "Describe the occasion, the people involved, the preparations, and what the tradition means to you. Include details that help a reader understand the experience without suggesting that everyone in your community celebrates in exactly the same way.",
          "If a tradition is private, sacred, or not intended for public sharing, respect that boundary. Not every part of a culture needs to be published for others to see."
        ],
        image:
          "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=1200&q=85",
        imageAlt: "A public celebration with people gathering together"
      },
      {
        eyebrow: "SHARE A TASTE OF HOME",
        title: "A recipe can carry family history.",
        paragraphs: [
          "A recipe becomes more interesting when you tell the story around it. Explain who taught you, when it is usually prepared, which ingredients matter most, or how the recipe has changed in your family.",
          "If you share a recipe from another creator or publication, identify the source and distinguish what you personally experienced from what you learned elsewhere."
        ],
        image:
          "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=85",
        imageAlt: "A selection of dishes and ingredients"
      },
      {
        eyebrow: "SHARE YOUR PLACE",
        title: "Help others see what makes home special.",
        paragraphs: [
          "Write about a local market, a familiar landscape, a community gathering, a neighbourhood sound, or a place that holds meaning for you. Details from daily life can help readers understand a location beyond its best-known landmarks.",
          "Think about privacy and safety when sharing locations. Avoid revealing another person's private address or publishing details that could put someone at risk."
        ],
        image:
          "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=85",
        imageAlt: "A landscape inviting a closer look at a place"
      }
    ],
    closingTitle: "Your story can be someone's first window into another world.",
    closingText:
      "Prepare your idea, gather any material you have permission to use, and explore cultural categories for inspiration. Direct publishing will become available when NiaWorld's contribution workflow is implemented.",
    primaryLabel: "Find inspiration",
    primaryHref: "/#categories",
    related: [
      {
        title: "Culture & Heritage",
        description: "Find inspiration in customs, celebrations, and heritage.",
        href: "/explore/culture-heritage"
      },
      {
        title: "Food & Flavours",
        description: "Explore the stories carried by recipes and meals.",
        href: "/explore/food-flavours"
      },
      {
        title: "Music & Art",
        description: "Discover creative work and cultural expression.",
        href: "/explore/music-art"
      }
    ]
  }
};

const journeyLinks = [
  { label: "Explore", href: "/journey/explore" },
  { label: "Discover", href: "/journey/discover" },
  { label: "Connect", href: "/journey/connect" },
  { label: "Share", href: "/journey/share" }
];

export default async function JourneyPage({
  params
}: {
  params: Promise<{ step: string }>;
}) {
  const { step } = await params;
  const page = pages[step];

  if (!page) {
    notFound();
  }

  return (
    <main className="journey-page">
      <style>{`
        .journey-page {
          --journey-green: #315c3b;
          --journey-green-dark: #203e29;
          --journey-cream: #f7f5ee;
          --journey-paper: #fffefa;
          --journey-terracotta: #a86d50;
          --journey-ink: #29332b;
          --journey-muted: #697166;
          --journey-line: #e3e5dc;
          background: var(--journey-cream);
          color: var(--journey-ink);
          min-height: 100vh;
          font-family: Arial, Helvetica, sans-serif;
        }

        .journey-page * {
          box-sizing: border-box;
        }

        .journey-container {
          width: min(1160px, calc(100% - 48px));
          margin-inline: auto;
        }

        .journey-header {
          min-height: 82px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          border-bottom: 1px solid var(--journey-line);
        }

        .journey-brand {
          display: inline-flex;
          align-items: center;
          gap: 11px;
          text-decoration: none;
          color: var(--journey-green-dark);
          font-size: 23px;
          font-weight: 750;
          letter-spacing: -0.8px;
        }

        .journey-brand-mark {
          width: 39px;
          height: 39px;
          border-radius: 14px 14px 14px 4px;
          background: var(--journey-green);
          color: white;
          display: grid;
          place-items: center;
          font-size: 21px;
        }

        .journey-header-nav {
          display: flex;
          align-items: center;
          gap: 22px;
          flex-wrap: wrap;
        }

        .journey-header-nav a {
          text-decoration: none;
          color: var(--journey-muted);
          font-size: 13px;
          font-weight: 700;
          transition: color 180ms ease;
        }

        .journey-header-nav a:hover,
        .journey-header-nav a[aria-current="page"] {
          color: var(--journey-green);
        }

        .journey-header-cta,
        .journey-button {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          min-height: 45px;
          padding: 0 19px;
          border-radius: 999px;
          text-decoration: none;
          font-size: 13px;
          font-weight: 750;
          background: var(--journey-green);
          color: white;
          transition: background 180ms ease, transform 180ms ease;
        }

        .journey-header-cta:hover,
        .journey-button:hover {
          background: var(--journey-green-dark);
          transform: translateY(-2px);
        }

        .journey-hero {
          position: relative;
          overflow: hidden;
          isolation: isolate;
          min-height: 500px;
          margin-top: 28px;
          border-radius: 25px;
          background: #334b37;
          display: flex;
          align-items: flex-end;
        }

        .journey-hero-image {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          z-index: -2;
        }

        .journey-hero::after {
          content: "";
          position: absolute;
          inset: 0;
          z-index: -1;
          background: linear-gradient(
            90deg,
            rgba(17, 37, 23, 0.88) 0%,
            rgba(17, 37, 23, 0.63) 47%,
            rgba(17, 37, 23, 0.13) 100%
          );
        }

        .journey-hero-content {
          max-width: 790px;
          padding: 70px clamp(26px, 6vw, 76px);
          color: white;
        }

        .journey-eyebrow {
          display: inline-flex;
          align-items: center;
          gap: 9px;
          margin-bottom: 24px;
          color: #e6d5bd;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 2px;
        }

        .journey-eyebrow::before {
          content: "";
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #c88e6c;
        }

        .journey-hero h1 {
          max-width: 720px;
          margin: 0;
          font-size: clamp(43px, 7vw, 80px);
          font-weight: 750;
          letter-spacing: -4px;
          line-height: 0.99;
        }

        .journey-hero h1 span {
          display: block;
          margin-top: 12px;
          color: #e7c0a7;
        }

        .journey-hero-description {
          max-width: 610px;
          margin: 25px 0 28px;
          color: rgba(255,255,255,0.88);
          font-size: 16px;
          line-height: 1.85;
        }

        .journey-hero .journey-button {
          background: #fffefa;
          color: var(--journey-green-dark);
        }

        .journey-hero .journey-button:hover {
          background: #e7e9df;
        }

        .journey-section {
          padding-block: 90px;
        }

        .journey-section-kicker {
          margin: 0 0 15px;
          color: var(--journey-terracotta);
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1.8px;
        }

        .journey-section h2 {
          max-width: 800px;
          margin: 0;
          font-size: clamp(32px, 4.5vw, 55px);
          letter-spacing: -2.1px;
          line-height: 1.08;
          font-weight: 750;
        }

        .journey-intro-grid {
          display: grid;
          grid-template-columns: 0.9fr 1.1fr;
          gap: 70px;
          align-items: start;
        }

        .journey-intro-copy p,
        .journey-detail-copy p {
          color: var(--journey-muted);
          font-size: 15px;
          line-height: 1.95;
          margin: 0 0 18px;
        }

        .journey-principles {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
          margin-top: 45px;
        }

        .journey-principle {
          border: 1px solid var(--journey-line);
          border-radius: 18px;
          padding: 27px;
          background: rgba(255,254,250,0.78);
        }

        .journey-principle-number {
          display: inline-grid;
          place-items: center;
          width: 38px;
          height: 38px;
          margin-bottom: 24px;
          border-radius: 12px;
          background: #e8ede3;
          color: var(--journey-green);
          font-size: 12px;
          font-weight: 800;
        }

        .journey-principle h3 {
          margin: 0 0 11px;
          font-size: 18px;
          letter-spacing: -0.4px;
        }

        .journey-principle p {
          margin: 0;
          color: var(--journey-muted);
          font-size: 13px;
          line-height: 1.8;
        }

        .journey-detail-section {
          padding-block: 76px;
          border-top: 1px solid var(--journey-line);
        }

        .journey-detail-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          align-items: center;
          gap: 65px;
        }

        .journey-detail-section:nth-of-type(even) .journey-detail-image {
          order: 2;
        }

        .journey-detail-image {
          display: block;
          width: 100%;
          height: 390px;
          object-fit: cover;
          border-radius: 20px;
          background: #e4e6dc;
        }

        .journey-detail-copy h2 {
          margin: 0 0 22px;
          font-size: clamp(28px, 3.7vw, 43px);
          letter-spacing: -1.6px;
          line-height: 1.12;
        }

        .journey-detail-copy .journey-section-kicker {
          margin-bottom: 14px;
        }

        .journey-related {
          background: #e9eee4;
          padding-block: 76px;
        }

        .journey-related-heading {
          display: flex;
          align-items: end;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 28px;
        }

        .journey-related-heading h2 {
          max-width: 620px;
        }

        .journey-related-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 17px;
        }

        .journey-related-card {
          min-height: 190px;
          padding: 27px;
          border: 1px solid rgba(49,92,59,0.13);
          border-radius: 17px;
          background: var(--journey-paper);
          color: var(--journey-ink);
          text-decoration: none;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          transition: transform 180ms ease, box-shadow 180ms ease;
        }

        .journey-related-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 15px 35px rgba(32,62,41,0.08);
        }

        .journey-related-card h3 {
          margin: 0 0 10px;
          font-size: 18px;
        }

        .journey-related-card p {
          margin: 0 0 20px;
          color: var(--journey-muted);
          font-size: 13px;
          line-height: 1.8;
        }

        .journey-related-card span {
          margin-top: auto;
          color: var(--journey-green);
          font-size: 13px;
          font-weight: 800;
        }

        .journey-closing {
          padding-block: 85px;
          text-align: center;
        }

        .journey-closing-inner {
          max-width: 760px;
          margin-inline: auto;
        }

        .journey-closing h2 {
          margin: 0 auto 18px;
          font-size: clamp(34px, 5vw, 58px);
          letter-spacing: -2px;
          line-height: 1.06;
        }

        .journey-closing p {
          max-width: 650px;
          margin: 0 auto 28px;
          color: var(--journey-muted);
          font-size: 15px;
          line-height: 1.9;
        }

        .journey-footer {
          background: #203e29;
          color: #fffefa;
          padding-block: 30px;
        }

        .journey-footer-inner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 22px;
        }

        .journey-footer p {
          margin: 0;
          color: rgba(255,255,255,0.7);
          font-size: 12px;
        }

        .journey-footer-links {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
        }

        .journey-footer-links a {
          color: #fffefa;
          text-decoration: none;
          font-size: 12px;
        }

        .journey-footer-links a:hover {
          color: #e7c0a7;
        }

        @media (max-width: 850px) {
          .journey-header {
            padding-block: 16px;
            align-items: flex-start;
          }

          .journey-header-nav {
            justify-content: flex-end;
            gap: 12px;
          }

          .journey-header-cta {
            display: none;
          }

          .journey-intro-grid,
          .journey-detail-grid {
            grid-template-columns: 1fr;
            gap: 28px;
          }

          .journey-principles {
            grid-template-columns: 1fr;
          }

          .journey-detail-section:nth-of-type(even) .journey-detail-image {
            order: initial;
          }

          .journey-related-grid {
            grid-template-columns: 1fr;
          }

          .journey-detail-image {
            height: 320px;
          }
        }

        @media (max-width: 560px) {
          .journey-container {
            width: min(100% - 30px, 1160px);
          }

          .journey-header {
            flex-direction: column;
            gap: 15px;
          }

          .journey-header-nav {
            justify-content: flex-start;
            gap: 15px;
          }

          .journey-header-nav a {
            font-size: 12px;
          }

          .journey-hero {
            min-height: 500px;
            margin-top: 15px;
            border-radius: 18px;
          }

          .journey-hero-content {
            padding: 36px 24px;
          }

          .journey-hero h1 {
            letter-spacing: -2px;
          }

          .journey-hero-description {
            font-size: 14px;
          }

          .journey-section {
            padding-block: 58px;
          }

          .journey-related {
            padding-block: 58px;
          }

          .journey-related-heading {
            display: block;
          }

          .journey-footer-inner {
            flex-direction: column;
            align-items: flex-start;
          }
        }
      `}</style>

      <header className="journey-container journey-header">
        <Link className="journey-brand" href="/" aria-label="NiaWorld home">
          <span className="journey-brand-mark">N</span>
          <span>NiaWorld</span>
        </Link>

        <nav className="journey-header-nav" aria-label="Journey navigation">
          {journeyLinks.map((item) => (
            <Link
              href={item.href}
              key={item.label}
              aria-current={step === item.label.toLowerCase() ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Link className="journey-header-cta" href="/#categories">
          Browse cultures <span aria-hidden="true">↗</span>
        </Link>
      </header>

      <section className="journey-container journey-hero">
        <img
          className="journey-hero-image"
          src={page.heroImage}
          alt={page.heroAlt}
          fetchPriority="high"
        />

        <div className="journey-hero-content">
          <p className="journey-eyebrow">
            {page.number} — {page.label}
          </p>

          <h1>
            {page.title}
            <span>{page.accent}</span>
          </h1>

          <p className="journey-hero-description">
            {page.description}
          </p>

          <Link className="journey-button" href={page.primaryHref}>
            {page.primaryLabel} <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </section>

      <section className="journey-container journey-section">
        <div className="journey-intro-grid">
          <div>
            <p className="journey-section-kicker">
              {page.number} / THE IDEA
            </p>
            <h2>{page.introTitle}</h2>
          </div>

          <div className="journey-intro-copy">
            {page.introParagraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
        </div>

        <div className="journey-principles">
          {page.principles.map((principle) => (
            <article className="journey-principle" key={principle.number}>
              <span className="journey-principle-number">
                {principle.number}
              </span>
              <h3>{principle.title}</h3>
              <p>{principle.description}</p>
            </article>
          ))}
        </div>
      </section>

      {page.sections.map((section, index) => (
        <section className="journey-detail-section" key={section.title}>
          <div className="journey-container journey-detail-grid">
            <img
              className="journey-detail-image"
              src={section.image}
              alt={section.imageAlt}
              loading="lazy"
            />

            <div className="journey-detail-copy">
              <p className="journey-section-kicker">
                {String(index + 1).padStart(2, "0")} / {section.eyebrow}
              </p>

              <h2>{section.title}</h2>

              {section.paragraphs.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </div>
        </section>
      ))}

      <section className="journey-related">
        <div className="journey-container">
          <div className="journey-related-heading">
            <div>
              <p className="journey-section-kicker">KEEP YOUR JOURNEY GOING</p>
              <h2>There is always another story to discover.</h2>
            </div>
          </div>

          <div className="journey-related-grid">
            {page.related.map((item) => (
              <Link
                className="journey-related-card"
                href={item.href}
                key={item.title}
              >
                <h3>{item.title}</h3>
                <p>{item.description}</p>
                <span>
                  Continue exploring <span aria-hidden="true">↗</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="journey-container journey-closing">
        <div className="journey-closing-inner">
          <p className="journey-section-kicker">
            REAL PEOPLE. REAL CULTURES. REAL CONNECTIONS.
          </p>

          <h2>{page.closingTitle}</h2>

          <p>{page.closingText}</p>

          <Link className="journey-button" href={page.primaryHref}>
            {page.primaryLabel} <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </section>

      <footer className="journey-footer">
        <div className="journey-container journey-footer-inner">
          <p>© 2026 NiaWorld. Built around curiosity, culture, and connection.</p>

          <nav className="journey-footer-links" aria-label="Footer navigation">
            <Link href="/">Home</Link>
            <Link href="/journey/explore">Explore</Link>
            <Link href="/journey/discover">Discover</Link>
            <Link href="/journey/connect">Connect</Link>
            <Link href="/journey/share">Share</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
