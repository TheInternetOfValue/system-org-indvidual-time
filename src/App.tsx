import { Suspense, lazy } from "react";

const IovTopologyCanvas = lazy(() => import("@/components/IovTopologyCanvas"));

const App = () => {
  return (
    <div className="app">
      <Suspense fallback={<div className="iov-app-loading">Loading Internet of Value topology...</div>}>
        <IovTopologyCanvas />
      </Suspense>
    </div>
  );
};

export default App;
