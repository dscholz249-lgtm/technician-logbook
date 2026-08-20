export default function GuidePage() {
  return (
    <iframe
      src="/product-guide.html"
      title="SkillCat Product Guide"
      style={{
        position: "fixed",
        // w-52 sidebar = 208px
        left: 208,
        top: 0,
        right: 0,
        bottom: 0,
        width: "calc(100vw - 208px)",
        height: "100vh",
        border: "none",
        zIndex: 10,
      }}
    />
  );
}
