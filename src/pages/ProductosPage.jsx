import "../styles/productos.css";

export default function ProductosPage() {
  return (
    <div className="productos-page">
      <header className="productos-header">
        <h2>Productos de interés</h2>
        <p className="productos-subtitle">
          Recomendaciones basadas en tu finca y tus cultivos.
        </p>
      </header>

      <section className="productos-intro">
        <p>
          Este espacio está reservado para patrocinadores y aliados
          estratégicos (productos agrícolas, insumos, herramientas)
          con el objetivo de ofrecer recomendaciones personalizadas
          según lo que cada usuario tenga en su finca.
        </p>
      </section>

      <section className="productos-placeholder">
        <div className="productos-card">
          <h3>Espacio para aliados comerciales</h3>
          <p>
            Próximamente aquí se mostrarán productos recomendados
            en función del tipo de cultivo, manejo productivo
            y necesidades detectadas en cada finca.
          </p>
        </div>
      </section>

      <footer className="productos-footer">
        <p className="productos-cta">
          ¿Interesado en formar parte? <br />
          <span>Contacto: jgartavia@gmail.com</span>
        </p>
      </footer>
    </div>
  );
}