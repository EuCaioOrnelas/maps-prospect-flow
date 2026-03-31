/**
 * Wraps external/public pages with the landing-light theme.
 * Internal (protected/dashboard) pages keep the default dark theme.
 */
const LightThemeWrapper = ({ children }: { children: React.ReactNode }) => {
  return <div className="landing-light">{children}</div>;
};

export default LightThemeWrapper;
