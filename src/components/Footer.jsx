// src/components/Footer.jsx
import "../styles/footer.css";

export default function Footer() {
  return (
    <footer className="app-footer">
      <div className="app-footer-container">
        
        {/* Logo El Colono */}
        <div className="footer-brand">
          <img
            className="footer-logo"
            alt="El Colono Agropecuario"
            src="https://www.colonoagropecuario.com/inicio/img/logo.png"
          />
          <p className="footer-tagline">
            Integración comercial demostrativa
          </p>
        </div>

        {/* Asesor */}
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

        {/* Enlaces */}
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

        {/* Redes */}
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
        © {new Date().getFullYear()} AgroMind CR — El Colono Agropecuario
      </div>
    </footer>
  );
}
