export function FooterStatus({ status, savedCount }) {
  return (
    <footer className="statusbar">
      <span>{status}</span>
      <span>{savedCount} saved</span>
    </footer>
  );
}
