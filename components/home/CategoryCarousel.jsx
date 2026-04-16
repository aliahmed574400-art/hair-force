import Image from "next/image";

function CategoryCarouselCard({ category }) {
  return (
    <article className="category-card">
      <div className="category-card-body">
        <div className="category-card-media">
          <Image
            src={category.image}
            alt={category.label}
            fill
            sizes="(max-width: 760px) 25vw, 150px"
            style={{ objectFit: "cover" }}
          />
        </div>
        <div className="category-card-copy">
          <h3>{category.label}</h3>
        </div>
      </div>
    </article>
  );
}

export default function CategoryCarousel({ categories }) {
  return (
    <div className="category-carousel">
      <div className="category-carousel-grid">
        {categories.map((category) => (
          <div key={category.label} className="category-carousel-slide">
            <CategoryCarouselCard category={category} />
          </div>
        ))}
      </div>
    </div>
  );
}
