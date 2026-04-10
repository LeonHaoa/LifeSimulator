import dynamic from "next/dynamic";

const WelcomeScreen = dynamic(
  () =>
    import("@/components/WelcomeScreen").then((mod) => mod.WelcomeScreen),
  {
    loading: () => (
      <div
        className="welcome-root"
        aria-busy="true"
        aria-label="加载中"
      />
    ),
  }
);

export default function HomePage() {
  return <WelcomeScreen />;
}
