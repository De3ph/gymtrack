/**
 * Applies the stored theme before first paint. The global 404 and 500 pages
 * render without the app layout, so they carry their own copy of it.
 */
export function ThemeBootScript() {
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `(function(){try{var s=localStorage.getItem("theme")||"system";var d=s==="dark"||(s==="system"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var e=document.documentElement;e.classList.toggle("dark",d);e.style.colorScheme=d?"dark":"light";}catch(e){}})();`,
      }}
    />
  );
}
