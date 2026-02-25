let blockInteriorSceneModulePromise: Promise<typeof import("./BlockInteriorScene")> | null = null;
let personIdentitySceneModulePromise: Promise<typeof import("./PersonIdentityScene")> | null = null;
let personImpactSceneModulePromise: Promise<typeof import("./PersonImpactScene")> | null = null;
let valueLogSceneModulePromise: Promise<typeof import("./ValueLogScene")> | null = null;

export const loadBlockInteriorSceneModule = () => {
  blockInteriorSceneModulePromise ??= import("./BlockInteriorScene");
  return blockInteriorSceneModulePromise;
};

export const loadPersonIdentitySceneModule = () => {
  personIdentitySceneModulePromise ??= import("./PersonIdentityScene");
  return personIdentitySceneModulePromise;
};

export const loadPersonImpactSceneModule = () => {
  personImpactSceneModulePromise ??= import("./PersonImpactScene");
  return personImpactSceneModulePromise;
};

export const loadValueLogSceneModule = () => {
  valueLogSceneModulePromise ??= import("./ValueLogScene");
  return valueLogSceneModulePromise;
};

export const preloadDeferredIovSceneModules = async () => {
  await Promise.all([
    loadBlockInteriorSceneModule(),
    loadPersonIdentitySceneModule(),
    loadPersonImpactSceneModule(),
    loadValueLogSceneModule(),
  ]);
};
