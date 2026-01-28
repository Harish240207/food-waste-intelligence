import "./Hero.css";

export default function Hero() {
  return (
    <section className="hero">
      <div className="hero-overlay" />

      <div className="hero-content">
        <h1>
          Reduce Food Wastage <br />
          with <span>AI Intelligence</span>
        </h1>

        <p>
          Smart billing and AI-powered demand prediction to help
          college hostels and canteens reduce food waste and costs.
        </p>

        <div className="hero-buttons">
          <a href="#dashboard" className="btn-primary">
            View Dashboard
          </a>
          <a href="#how" className="btn-secondary">
            How it Works
          </a>
        </div>
      </div>
    </section>
  );
}
