// src/components/Footer.jsx
import "../styles/footer.css";

export default function Footer() {
  return (
    <footer className="app-footer">
      <div className="app-footer-container">
        {/* Logo El Colono (incrustado, no se rompe por hotlink) */}
        <div className="footer-brand">
          <img
            className="footer-logo"
            alt="El Colono Agropecuario"
            src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAO0AAABjCAIAAAD4lRBwAAAQAElEQVR4AexdB2AURdue2b2aS7tLb6QnJCEEEhCEhN5rAOkgKioq6EiU1I6KARER9EApqAiiSgKjoqCCpIKK+DWKiAK+KIqAoqgQxHFvZt9kZ2b2yJf3ZPZkZ2b2b2b+fM8+fPz8+fP3/+8z8d3m+vS0nq7gQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJw9bR2z0rL5p0FjWgW3Xv2m7xJfY9aX6d9s0v8c2u4Y2s3v8c2k0y6p5Wq1m4cPHz4cOHiwYMHjx49evTogYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBgYGBoYk5h9m9G2c7c9Q6yqj1c8QnqV3tY9p1uWm7cCqfWZbq3f9r1m5m0qk3y9bq8bGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsbGxsYm+o7f4m9w9c2m3bqf3n9KxY8ePHj16+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4+Pj4AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAP8D2H8yqv4rJQAAAABJRU5ErkJggg=="
          />
          <p className="footer-tagline">Integración comercial demostrativa</p>
        </div>

        <div className="footer-section">
          <h4>Asesor de venta</h4>
          <p className="muted">Asesor (Demo)</p>
          <a
            className="footer-link"
            href="https://wa.me/50670000000"
            target="_blank"
            rel="noreferrer"
          >
            WhatsApp: +506 7000-0000
          </a>
          <p className="muted small">*Datos ficticios para propuesta.</p>
        </div>

        <div className="footer-section">
          <h4>Enlaces</h4>
          <a
            className="footer-link"
            href="https://www.colonoagropecuario.com/"
            target="_blank"
            rel="noreferrer"
          >
            Sitio oficial
          </a>
          <a
            className="footer-link"
            href="https://www.colonoagropecuario.com/tienda/"
            target="_blank"
            rel="noreferrer"
          >
            Tienda en línea
          </a>
        </div>

        <div className="footer-section">
          <h4>Redes</h4>
          <a
            className="footer-link"
            href="https://www.facebook.com/colonoagropecuario/"
            target="_blank"
            rel="noreferrer"
          >
            Facebook
          </a>
          <a
            className="footer-link"
            href="https://www.instagram.com/colonoagropecuario_cr/"
            target="_blank"
            rel="noreferrer"
          >
            Instagram
          </a>
        </div>
      </div>

      <div className="footer-bottom">
        © {new Date().getFullYear()} AgroMind CR — Propuesta para El Colono Agropecuario
      </div>
    </footer>
  );
}
