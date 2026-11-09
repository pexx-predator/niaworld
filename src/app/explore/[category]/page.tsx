
import Link from "next/link";
import { notFound } from "next/navigation";

export const instant = false;

type Story = {
  title: string;
  label: string;
  description: string;
  image: string;
  imageAlt: string;
};

type CategoryContent = {
  title: string;
  eyebrow: string;
  description: string;
  image: string;
  imageAlt: string;
  introduction: string;
  highlights: string[];
  insightTitle: string;
  insightText: string;
  stories: Story[];
  related: string[];
};

const content: Record<string, CategoryContent> = {
  "food-flavours": {
    title: "A world of flavours",
    eyebrow: "FOOD & FLAVOURS",
    description:
      "Travel through the world's kitchens and discover the dishes, ingredients, cooking techniques, and family recipes that bring people together. Food can tell stories about geography, history, celebration, identity, and the people who prepare it.",
    image:
      "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1800&q=85",
    imageAlt: "A colourful spread of food and fresh ingredients",
    introduction:
      "A meal is rarely just a meal. It can welcome a guest, celebrate a milestone, preserve a family memory, or connect generations. From busy street markets to home kitchens and festive gatherings, food gives us a delicious way to learn about how people live.",
    highlights: [
      "Traditional dishes",
      "Local ingredients",
      "Family recipes",
      "Street food",
      "Food celebrations",
      "Cooking traditions",
    ],
    insightTitle: "Every dish has a story",
    insightText:
      "Climate, landscape, trade, migration, and local farming all influence what people eat. Coastal communities may build meals around fish and coconut, while other regions rely on grains, root vegetables, or livestock. Recipes also change as families travel and share ideas. Exploring these differences helps us appreciate food as both a daily necessity and a living expression of culture.",
    stories: [
      {
        title: "The traditions behind a shared meal",
        label: "FOOD CULTURE",
        description:
          "Discover why eating together matters in many communities. Meals can express hospitality, strengthen family bonds, welcome visitors, and mark important moments. Learn how table customs and the meaning of sharing food differ from one place to another.",
        image:
          "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=900&q=85",
        imageAlt: "A welcoming restaurant dining area",
      },
      {
        title: "Discover the flavours of Kenya",
        label: "KENYA",
        description:
          "Explore dishes such as ugali, sukuma wiki, githeri, nyama choma, and coastal foods influenced by centuries of exchange. Learn how ingredients, regional preferences, family habits, and occasions shape what people prepare and enjoy.",
        image:
          "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=85",
        imageAlt: "A colourful meal presented for sharing",
      },
      {
        title: "From farm to family kitchen",
        label: "INGREDIENTS",
        description:
          "Follow the journey of food from farms, fishing communities, gardens, and markets to the kitchen. Discover how seasons, local growing conditions, preservation methods, and traditional knowledge influence the ingredients available to different communities.",
        image:
          "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=900&q=85",
        imageAlt: "Fresh produce displayed at a market",
      },
      {
        title: "The excitement of street food",
        label: "FOOD DISCOVERY",
        description:
          "Explore the snacks and quick meals sold along streets and in busy market areas. Street food often reflects local tastes, working life, regional ingredients, and creative cooking. Discover how vendors and customers help make these places social meeting points.",
        image:
          "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?auto=format&fit=crop&w=900&q=85",
        imageAlt: "Food being prepared for a meal",
      },
      {
        title: "Recipes passed between generations",
        label: "FAMILY STORIES",
        description:
          "Some recipes survive through handwritten notes, while others are taught by watching, tasting, and cooking together. Explore how families adapt recipes over time while preserving the flavours, memories, and techniques that make a dish meaningful.",
        image:
          "https://images.unsplash.com/photo-1556911220-e15b29be8c8f?auto=format&fit=crop&w=900&q=85",
        imageAlt: "A kitchen where food is prepared",
      },
    ],
    related: ["culture-heritage", "places-travel", "everyday-life"],
  },

  "places-travel": {
    title: "Places that tell stories",
    eyebrow: "PLACES & TRAVEL",
    description:
      "Discover landscapes, cities, neighbourhoods, historic places, and local experiences through the people who know them best. Travel becomes more meaningful when we look beyond the view and learn about the lives connected to a place.",
    image:
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1800&q=85",
    imageAlt: "Mountain peaks stretching across a scenic landscape",
    introduction:
      "Every destination has layers of stories. The landscape may reveal how people grow food or build homes, while a market or community gathering can show what matters in everyday life. You can begin discovering the world from home, then carry that curiosity wherever you travel.",
    highlights: [
      "Natural landscapes",
      "Cities and towns",
      "Local communities",
      "Historic places",
      "Travel traditions",
      "Responsible tourism",
    ],
    insightTitle: "A destination is more than a photograph",
    insightText:
      "The places we visit are homes, workplaces, sacred spaces, ecosystems, and sources of livelihood. Learning about local history and customs helps visitors approach destinations with respect. It can also reveal stories that are missed when travel is limited to famous landmarks. A thoughtful journey makes room for local voices, cultural context, and the environment.",
    stories: [
      {
        title: "Explore the landscapes of Kenya",
        label: "KENYA",
        description:
          "Discover the diversity of Kenya's landscapes, from the Great Rift Valley and highland farms to lakes, forests, coastal environments, and open savannahs. Learn how geography and climate influence local livelihoods, settlement, and travel experiences.",
        image:
          "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&w=900&q=85",
        imageAlt: "Wild landscapes beneath a broad African sky",
      },
      {
        title: "See a destination through local eyes",
        label: "LOCAL PERSPECTIVES",
        description:
          "Go beyond visitor attractions and discover the everyday places residents value. Local markets, neighbourhood cafés, public spaces, and community events can reveal a destination's character in ways that a sightseeing checklist cannot.",
        image:
          "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=900&q=85",
        imageAlt: "A peaceful lake surrounded by mountains",
      },
      {
        title: "Discover the stories of historic places",
        label: "HISTORY",
        description:
          "Buildings, old trading routes, monuments, and archaeological sites can reveal how societies changed through migration, exchange, conflict, and cooperation. Explore how historical places connect past events with the communities living around them today.",
        image:
          "https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=900&q=85",
        imageAlt: "An atmospheric historic destination",
      },
      {
        title: "Find wonder in the natural world",
        label: "NATURE",
        description:
          "Explore mountains, forests, coastlines, deserts, and wetlands as places of beauty and ecological importance. Discover how communities depend on local environments and why responsible visits can help protect landscapes for future generations.",
        image:
          "https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=900&q=85",
        imageAlt: "A tranquil natural landscape with mountains",
      },
      {
        title: "Travel with respect and curiosity",
        label: "RESPONSIBLE TRAVEL",
        description:
          "Learn how to research local customs, ask before photographing people, respect cultural and sacred spaces, and support local businesses. Thoughtful travel makes space for genuine learning while recognising that destinations are living communities, not just attractions.",
        image:
          "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=900&q=85",
        imageAlt: "Travel essentials prepared for a journey",
      },
    ],
    related: ["culture-heritage", "food-flavours", "everyday-life"],
  },

  "culture-heritage": {
    title: "Traditions with meaning",
    eyebrow: "CULTURE & HERITAGE",
    description:
      "Explore the customs, celebrations, crafts, values, and shared memories through which communities express their identities. Culture is not frozen in the past: it continues to grow as people preserve traditions, reinterpret them, and create new ones.",
    image:
      "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=1800&q=85",
    imageAlt: "A lively public celebration filled with colour",
    introduction:
      "Heritage can be found in major festivals, but it also lives in ordinary moments: a greeting, a family gathering, a craft technique, a story told by an elder, or a custom practised at home. Learning about traditions works best when we explore their meaning and listen to the people who carry them.",
    highlights: [
      "Cultural celebrations",
      "Family traditions",
      "Traditional crafts",
      "Oral histories",
      "Cultural identity",
      "Living heritage",
    ],
    insightTitle: "Culture is a living story",
    insightText:
      "Cultural traditions are shaped by generations of experience, yet they are not identical for everyone within a community. People may practise customs differently according to region, family, age, personal beliefs, or changing circumstances. Understanding heritage means recognising both what communities preserve and how individuals continue to shape their own cultural lives.",
    stories: [
      {
        title: "Understanding cultural celebrations",
        label: "CELEBRATIONS",
        description:
          "Discover how festivals and gatherings can mark harvests, religious occasions, seasonal changes, national milestones, or important stages of life. Learn to ask what a celebration means to its participants rather than assuming that similar-looking events share the same purpose.",
        image:
          "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&w=900&q=85",
        imageAlt: "A colourful public festival",
      },
      {
        title: "The meaning behind traditional crafts",
        label: "CRAFT & HERITAGE",
        description:
          "Explore textiles, beadwork, pottery, carving, weaving, and other forms of craftsmanship. Materials and patterns may reflect local resources, practical needs, aesthetic choices, or cultural meanings that become clearer when explained by the makers themselves.",
        image:
          "https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=900&q=85",
        imageAlt: "Creative materials arranged for handmade work",
      },
      {
        title: "Stories shared across generations",
        label: "ORAL HISTORY",
        description:
          "Long before a story is written down, it may be carried through conversations, songs, proverbs, family histories, and community storytelling. Discover how oral traditions preserve memories, teach lessons, and change as storytellers adapt them for new audiences.",
        image:
          "https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=900&q=85",
        imageAlt: "A family spending time together",
      },
      {
        title: "Discover the many cultures of Kenya",
        label: "KENYA",
        description:
          "Kenya is home to many communities with distinct histories, languages, artistic traditions, foodways, and celebrations. Explore cultural diversity with care, recognising that no single practice represents every person in a community and that traditions can differ between regions and families.",
        image:
          "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&w=900&q=85",
        imageAlt: "A broad landscape in East Africa",
      },
      {
        title: "How heritage continues to evolve",
        label: "LIVING CULTURE",
        description:
          "Communities preserve important knowledge while adapting to new technologies, changing environments, migration, and modern life. Discover how cultural continuity and change can exist together, allowing traditions to remain meaningful without being treated as unchanging.",
        image:
          "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=900&q=85",
        imageAlt: "People gathering and connecting",
      },
    ],
    related: ["music-art", "languages", "food-flavours"],
  },

  "music-art": {
    title: "Creativity without borders",
    eyebrow: "MUSIC & ART",
    description:
      "Listen to the sounds, explore the colours, and discover the creative ideas through which people express emotions, tell stories, preserve knowledge, and imagine new possibilities. Creativity connects local traditions with ideas that travel around the world.",
    image:
      "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=1800&q=85",
    imageAlt: "Colourful art materials in a creative studio",
    introduction:
      "Music and art can make a place memorable long after a visit ends. A rhythm can accompany a celebration, a painting can capture a personal experience, and a handmade object can carry knowledge about its materials and maker. Every creative work offers an invitation to look, listen, and ask questions.",
    highlights: [
      "Music and rhythm",
      "Visual arts",
      "Traditional instruments",
      "Dance and performance",
      "Handmade crafts",
      "Modern creativity",
    ],
    insightTitle: "Creative expression connects people",
    insightText:
      "Artistic expression often develops through a conversation between personal imagination and community experience. Instruments, musical styles, patterns, colours, and performance traditions can have different meanings in different settings. Rather than treating any art form as a single symbol for an entire culture, we can explore its context, its makers, and the many ways people experience it.",
    stories: [
      {
        title: "Music as a shared language",
        label: "MUSIC",
        description:
          "Discover how melodies, rhythms, instruments, and songs feature in celebrations, ceremonies, entertainment, and everyday life. Explore how musicians draw from their surroundings and how musical ideas travel, mix, and develop into new styles.",
        image:
          "https://images.unsplash.com/photo-1516280440614-37939bbacd81?auto=format&fit=crop&w=900&q=85",
        imageAlt: "A musician performing on stage",
      },
      {
        title: "Art inspired by everyday life",
        label: "VISUAL ARTS",
        description:
          "Explore paintings, illustrations, photography, sculpture, and mixed-media work. Artists may find inspiration in family memories, city streets, landscapes, social questions, or abstract ideas, using different materials to communicate perspectives that words alone may not express.",
        image:
          "https://images.unsplash.com/photo-1513364776144-60967b0f800f?auto=format&fit=crop&w=900&q=85",
        imageAlt: "A colourful collection of art supplies",
      },
      {
        title: "Craftsmanship and handmade objects",
        label: "CRAFT",
        description:
          "Discover the patience and knowledge behind weaving, pottery, carving, jewellery, textiles, and other handmade work. Learn how makers select materials, develop techniques, solve practical problems, and sometimes preserve skills learned from earlier generations.",
        image:
          "https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=900&q=85",
        imageAlt: "Artistic materials and creative work",
      },
      {
        title: "Dance, movement, and performance",
        label: "PERFORMANCE",
        description:
          "Explore how movement, costume, music, and storytelling come together in dance and live performance. Different forms can be used for celebration, artistic expression, community gatherings, or storytelling, with meanings shaped by their particular context.",
        image:
          "https://images.unsplash.com/photo-1504609813442-a8924e83f76e?auto=format&fit=crop&w=900&q=85",
        imageAlt: "An energetic live performance",
      },
      {
        title: "Where tradition meets new ideas",
        label: "CONTEMPORARY CREATIVITY",
        description:
          "Meet the possibilities created when artists combine inherited techniques with digital tools, contemporary design, and new influences. Explore how creative people honour earlier work while experimenting with fresh approaches that speak to the world around them.",
        image:
          "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=900&q=85",
        imageAlt: "A notebook ready for creative ideas",
      },
    ],
    related: ["culture-heritage", "languages", "everyday-life"],
  },

  languages: {
    title: "Every language opens a door",
    eyebrow: "LANGUAGES",
    description:
      "Discover the words people use to greet friends, express respect, share humour, and tell stories. Explore spoken, written, and signed languages, and learn how communication helps people build relationships across cultures.",
    image:
      "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1800&q=85",
    imageAlt: "A notebook and writing materials on a desk",
    introduction:
      "Learning a language is about more than memorising vocabulary. It also involves listening carefully, understanding context, noticing how people express politeness, and accepting that communication can vary between regions and situations. Even a small effort to learn someone's words can open a meaningful conversation.",
    highlights: [
      "Everyday greetings",
      "Useful expressions",
      "Writing systems",
      "Language and identity",
      "Proverbs and sayings",
      "Communication across cultures",
    ],
    insightTitle: "Words carry more than definitions",
    insightText:
      "A word can communicate information while also expressing respect, familiarity, humour, or emotion. The appropriate greeting or form of address may depend on the relationship, setting, or local custom. Language also changes over time as communities interact and new generations create fresh ways of expressing themselves. Curiosity and respectful questions are valuable companions when learning.",
    stories: [
      {
        title: "Start with a Swahili greeting",
        label: "KISWAHILI",
        description:
          "Begin exploring Kiswahili with useful expressions such as “Habari?” for asking how someone is, “Asante” for thank you, and “Karibu” for welcome. Learn how pronunciation, context, and the response to a greeting help make a conversation feel natural.",
        image:
          "https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=900&q=85",
        imageAlt: "A notebook ready for language practice",
      },
      {
        title: "Expressions that reveal cultural meaning",
        label: "EVERYDAY EXPRESSIONS",
        description:
          "Explore idioms, proverbs, forms of politeness, and familiar sayings. Their meanings may not be obvious from a direct translation, so learning the situations in which people use them can reveal something about humour, values, relationships, and local history.",
        image:
          "https://images.unsplash.com/photo-1456324504439-367cee3b3c32?auto=format&fit=crop&w=900&q=85",
        imageAlt: "Books and notes for learning",
      },
      {
        title: "Many ways to write and communicate",
        label: "WRITING SYSTEMS",
        description:
          "Discover how alphabets, syllabaries, logographic systems, and other writing methods represent language. Explore the role of reading and writing in everyday life while remembering that many languages are also communicated through signing and spoken traditions.",
        image:
          "https://images.unsplash.com/photo-1517842645767-c639042777db?auto=format&fit=crop&w=900&q=85",
        imageAlt: "An open notebook on a desk",
      },
      {
        title: "The sounds that shape a language",
        label: "PRONUNCIATION",
        description:
          "Learn why unfamiliar sounds can take practice and why accents naturally vary among speakers. Listening, repeating short phrases, and learning from fluent speakers can help build confidence without expecting everyone to speak in exactly the same way.",
        image:
          "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=85",
        imageAlt: "A person working with a laptop",
      },
      {
        title: "Language, belonging, and identity",
        label: "LANGUAGE & CULTURE",
        description:
          "Languages can connect people with family histories, literature, songs, and community memories. Discover how multilingual people move between languages in daily life and why preserving linguistic diversity matters to communities and future generations.",
        image:
          "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=900&q=85",
        imageAlt: "Books and learning materials",
      },
    ],
    related: ["culture-heritage", "everyday-life", "music-art"],
  },

  "everyday-life": {
    title: "The beauty of everyday life",
    eyebrow: "EVERYDAY LIFE",
    description:
      "Some of the most meaningful cultural discoveries happen in ordinary moments: a morning routine, a market visit, a family meal, a commute, or a conversation between neighbours. Explore the details that make daily life familiar in some ways and wonderfully different in others.",
    image:
      "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=1800&q=85",
    imageAlt: "People sharing time and connecting in a community",
    introduction:
      "Culture is present in the way people organise their days, care for relatives, celebrate achievements, spend free time, and support their neighbours. These details may not appear in travel guides, but they often offer a rich picture of what life means to the people living it.",
    highlights: [
      "Daily routines",
      "Markets and neighbourhoods",
      "Family life",
      "Work and livelihoods",
      "Leisure and hobbies",
      "Community connections",
    ],
    insightTitle: "Ordinary moments can reveal extraordinary things",
    insightText:
      "Daily life is shaped by many factors, including local environment, access to resources, work, family responsibilities, technology, and personal choices. There is no single way that everyone in a country or community lives. By exploring individual experiences with respect, we can appreciate both shared human needs and the diversity of ways people meet them.",
    stories: [
      {
        title: "A morning at the local market",
        label: "COMMUNITY",
        description:
          "Discover the produce, conversations, routines, and relationships that make markets important parts of many communities. Markets can be places to earn a living, exchange news, maintain social ties, and find ingredients connected to local food traditions.",
        image:
          "https://images.unsplash.com/photo-1488459716781-31db52582fe9?auto=format&fit=crop&w=900&q=85",
        imageAlt: "Fresh goods arranged at a market",
      },
      {
        title: "What makes a place feel like home?",
        label: "HOME & FAMILY",
        description:
          "Explore the everyday rituals that create familiarity and belonging, from preparing meals and sharing responsibilities to celebrating milestones and looking after relatives. Discover how household routines vary while reflecting care, relationships, and individual circumstances.",
        image:
          "https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=900&q=85",
        imageAlt: "A family spending time together",
      },
      {
        title: "Work, skills, and local livelihoods",
        label: "WORK & LIFE",
        description:
          "Learn about the people whose work keeps communities moving, including farmers, traders, craftspeople, teachers, service workers, and entrepreneurs. Explore how occupations connect to local environments, traditions, skills, and changing economic opportunities.",
        image:
          "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=900&q=85",
        imageAlt: "People collaborating in a workplace",
      },
      {
        title: "How people spend their free time",
        label: "LEISURE",
        description:
          "Discover the activities that help people relax, learn, and connect, including sport, music, gardening, storytelling, games, and time outdoors. Free time looks different across households and communities, shaped by interests, opportunities, and daily responsibilities.",
        image:
          "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&q=85",
        imageAlt: "Friends enjoying time together",
      },
      {
        title: "Small acts that build community",
        label: "CONNECTION",
        description:
          "Explore how neighbours help one another, how people welcome visitors, and how local groups organise shared activities. Everyday acts of cooperation can strengthen trust and belonging, even when people have different backgrounds, routines, or perspectives.",
        image:
          "https://images.unsplash.com/photo-1511632765486-a01980e01a18?auto=format&fit=crop&w=900&q=85",
        imageAlt: "People gathering together",
      },
    ],
    related: ["food-flavours", "places-travel", "languages"],
  },
};

const categoryLabels: Record<string, string> = {
  "food-flavours": "Food & Flavours",
  "places-travel": "Places & Travel",
  "culture-heritage": "Culture & Heritage",
  "music-art": "Music & Art",
  languages: "Languages",
  "everyday-life": "Everyday Life",
};

export default async function ExploreCategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const page = content[category];

  if (!page) {
    notFound();
  }

  return (
    <main className="explore-page">
      <header className="explore-header">
        <Link className="explore-brand" href="/">
          <span className="explore-brand-mark">N</span>
          <span>
            Nia<span className="explore-brand-accent">World</span>
          </span>
        </Link>

        <nav className="explore-header-nav" aria-label="Category navigation">
          <Link href="/">Home</Link>
          <Link href="/#categories">Explore categories</Link>
          <Link href="/#community">Community</Link>
        </nav>

        <Link className="explore-header-cta" href="/#join">
          Join NiaWorld <span aria-hidden="true">↗</span>
        </Link>
      </header>

      <section className="explore-hero">
        <div className="explore-hero-image">
          <img src={page.image} alt={page.imageAlt} />
        </div>

        <div className="explore-hero-overlay" />

        <div className="explore-hero-content">
          <Link className="explore-back-link" href="/#categories">
            <span aria-hidden="true">←</span> All categories
          </Link>

          <p className="explore-eyebrow">
            <span className="explore-eyebrow-dot" />
            {page.eyebrow}
          </p>

          <h1>{page.title}</h1>
          <p className="explore-hero-description">{page.description}</p>

          <a className="explore-primary-button" href="#stories">
            Discover the stories <span aria-hidden="true">↓</span>
          </a>
        </div>

        <span className="explore-hero-caption">
          REAL PEOPLE. REAL CULTURES. REAL CONNECTIONS.
        </span>
      </section>

      <section className="explore-intro">
        <div className="explore-section-label">
          <span>01</span>
          <p>FOLLOW YOUR CURIOSITY</p>
        </div>

        <div className="explore-intro-grid">
          <h2>
            There is always
            <span> something new</span>
            <span className="explore-green-text"> to discover.</span>
          </h2>

          <div className="explore-intro-copy">
            <p>{page.introduction}</p>
            <p>
              NiaWorld is a growing cultural discovery space. Explore different
              perspectives, learn about local experiences, and approach every
              community with curiosity rather than assumptions.
            </p>
          </div>
        </div>

        <div className="explore-topic-list">
          {page.highlights.map((highlight, index) => (
            <div className="explore-topic" key={highlight}>
              <span className="explore-topic-number">
                {String(index + 1).padStart(2, "0")}
              </span>
              <span>{highlight}</span>
              <span className="explore-topic-arrow" aria-hidden="true">
                ↗
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="explore-feature">
        <div className="explore-feature-symbol" aria-hidden="true">
          ✳
        </div>
        <div className="explore-feature-content">
          <p className="explore-feature-label">A CLOSER LOOK</p>
          <h2>{page.insightTitle}</h2>
          <p>{page.insightText}</p>
        </div>
        <div className="explore-feature-number" aria-hidden="true">
          N.
        </div>
      </section>

      <section className="explore-stories" id="stories">
        <div className="explore-stories-heading">
          <div>
            <div className="explore-section-label">
              <span>02</span>
              <p>EXPLORE THE SUBJECT</p>
            </div>

            <h2>
              Stories worth <span className="explore-green-text">discovering.</span>
            </h2>
          </div>

          <p>
            Explore different aspects of this subject, discover new details,
            and find ideas that inspire you to keep learning.
          </p>
        </div>

        <div className="explore-story-grid">
          {page.stories.map((story, index) => (
            <article className="explore-story-card" key={story.title}>
              <div className="explore-story-image">
                <img
                  src={story.image}
                  alt={story.imageAlt}
                  loading="lazy"
                />
                <span className="explore-story-index">
                  {String(index + 1).padStart(2, "0")}
                </span>
              </div>

              <div className="explore-story-body">
                <p className="explore-story-label">{story.label}</p>
                <h3>{story.title}</h3>
                <p className="explore-story-description">
                  {story.description}
                </p>
              </div>
            </article>
          ))}
        </div>

        <p className="explore-content-note">
          These stories are introductory cultural guides. As NiaWorld grows,
          they can be expanded into full articles with community contributions,
          interviews, videos, and additional photographs.
        </p>
      </section>

      <section className="explore-related">
        <div className="explore-section-label">
          <span>03</span>
          <p>KEEP EXPLORING</p>
        </div>

        <div className="explore-related-heading">
          <h2>
            One discovery <span>leads to another.</span>
          </h2>
          <p>
            Culture connects many parts of life. Follow another interest to
            discover a different side of the world.
          </p>
        </div>

        <div className="explore-related-grid">
          {page.related.map((slug, index) => (
            <Link
              className="explore-related-card"
              href={`/explore/${slug}`}
              key={slug}
            >
              <span className="explore-related-index">
                0{index + 1}
              </span>
              <span className="explore-related-name">
                {categoryLabels[slug]}
              </span>
              <span className="explore-related-arrow" aria-hidden="true">
                ↗
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="explore-cta">
        <div className="explore-cta-decoration" aria-hidden="true">
          ✳
        </div>

        <p className="explore-cta-eyebrow">YOUR WORLD IS PART OF OUR WORLD</p>

        <h2>
          Every new perspective
          <span> brings us closer.</span>
        </h2>

        <p>
          Keep exploring, stay curious, and discover the people, ideas, and
          experiences that connect us across cultures.
        </p>

        <div className="explore-cta-actions">
          <Link className="explore-cta-primary" href="/#categories">
            Explore more categories <span aria-hidden="true">↗</span>
          </Link>

          <Link className="explore-cta-secondary" href="/">
            Return to homepage
          </Link>
        </div>
      </section>

      <footer className="explore-footer">
        <Link className="explore-brand" href="/">
          <span className="explore-brand-mark">N</span>
          <span>
            Nia<span className="explore-brand-accent">World</span>
          </span>
        </Link>

        <p>Real People. Real Cultures. Real Connections.</p>

        <Link href="/#home">Back to home ↑</Link>

        <div className="explore-footer-bottom">
          <span>© 2026 NiaWorld</span>
          <span>Built around curiosity, culture, and connection.</span>
        </div>
      </footer>
    </main>
  );
}
