import "../styles/winnow.css";

export default function PageHero({ title, subtitle, rightBadge, bg }) {
  return (
    <section className="pageHero" style={{ "--hero-bg": `url(${bg})` }}>
      <div className="pageHeroOverlay" />
      <div className="pageHeroInner">
        <div>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>

        {rightBadge ? <div className="pageHeroBadge">{rightBadge}</div> : null}
      </div>
    </section>
  );
}
