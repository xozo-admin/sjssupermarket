export default function StorefrontLoader() {
  return (
    <div className="storefront-page-loader" role="status" aria-label="Loading storefront">
      <div className="storefront-tile-loader" aria-hidden="true">
        {Array.from({ length: 9 }, (_, index) => <span key={index} />)}
      </div>
      <span className="sr-only">Loading...</span>
    </div>
  );
}
