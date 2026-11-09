
const cultureStories = [
  {
    title: "Beadwork & Identity",
    description:
      "Discover the craftsmanship, colours, and cultural meaning of traditional Maasai beadwork.",
    image:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Handmade_maasai_beadwork.jpg?width=1000",
    alt: "Traditional Maasai beadwork from Kenya",
    credit: "Photo: Cecilia Nkini · CC BY-SA 4.0",
    source:
      "https://commons.wikimedia.org/wiki/File:Handmade_maasai_beadwork.jpg",
  },
  {
    title: "Food & Everyday Life",
    description:
      "Explore Kenyan food traditions through familiar dishes such as ugali, sukuma wiki, and nyama.",
    image:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Fried_Steak,_Ugali_and_Sukuma_Wiki_(Embu).JPG?width=1000",
    alt: "Ugali, sukuma wiki, and steak in a Kenyan food photograph",
    credit: "Photo: Napendakukula · CC BY-SA 4.0",
    source:
      "https://commons.wikimedia.org/wiki/File:Fried_Steak,_Ugali_and_Sukuma_Wiki_(Embu).JPG",
  },
  {
    title: "Music & Dance",
    description:
      "Experience traditional Kenyan dance and the performances that bring communities together.",
    image:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Kenyan_Cultural_Dance.jpg?width=1000",
    alt: "Traditional Kenyan cultural dance performance",
    credit: "Photo: Jnncreatives · CC BY-SA 4.0",
    source:
      "https://commons.wikimedia.org/wiki/File:Kenyan_Cultural_Dance.jpg",
  },
  {
    title: "Swahili Coastal Heritage",
    description:
      "Explore the carved doors, coral-stone walls, and architectural heritage of historic Lamu.",
    image:
      "https://commons.wikimedia.org/wiki/Special:FilePath/Swahili_door_and_traditional_coral_walls_in_Lamu,_Kenya.jpg?width=1000",
    alt: "Traditional Swahili door and coral-stone walls in Lamu, Kenya",
    credit: "Photo: Elena.laps · CC BY-SA 4.0",
    source:
      "https://commons.wikimedia.org/wiki/File:Swahili_door_and_traditional_coral_walls_in_Lamu,_Kenya.jpg",
  },
];

export default function KenyanCulture() {
  return (
    <section className="kenyan-culture" id="kenyan-culture">
      <div className="kenyan-culture-heading">
        <span className="culture-eyebrow">
          A COUNTRY OF MANY STORIES
        </span>

        <h2>Discover the cultures of Kenya.</h2>

        <p>
          From the coast to the highlands, every community has
          stories, traditions, and perspectives worth sharing.
        </p>
      </div>

      <div className="kenyan-culture-grid">
        {cultureStories.map((story) => (
          <article
            className="kenyan-culture-card"
            key={story.title}
          >
            <a
              className="culture-image-link"
              href={story.source}
              target="_blank"
              rel="noreferrer"
              aria-label={`View photograph source: ${story.title}`}
            >
              <img
                src={story.image}
                alt={story.alt}
                loading="lazy"
                decoding="async"
                onError={(event) => {
                  const image = event.currentTarget;
                  image.alt = `${story.alt} — image unavailable. Open the source link to view the photograph.`;
                  image.style.visibility = "hidden";
                }}
              />
            </a>

            <div className="kenyan-culture-card-copy">
              <h3>{story.title}</h3>
              <p>{story.description}</p>
              <small>
                <a
                  href={story.source}
                  target="_blank"
                  rel="noreferrer"
                >
                  {story.credit} · View source
                </a>
              </small>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
