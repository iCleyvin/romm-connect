// by Cleyvin
//
// Platform -> EmulatorJS core mapping. Mirrors the table the RoMM web client
// ships (frontend/src/utils/index.ts) so a game that plays in the browser
// resolves to the same core here.

const EJS_CORES: Record<string, readonly string[]> = {
  "3do": ["opera"],
  acpc: ["cap32", "crocods"],
  amiga: ["puae"],
  "amiga-cd32": ["puae"],
  arcade: [
    "mame2003_plus",
    "mame2003",
    "fbneo",
    "fbalpha2012_cps1",
    "fbalpha2012_cps2",
  ],
  neogeoaes: ["fbneo"],
  neogeomvs: ["fbneo"],
  atari2600: ["stella2014"],
  "atari-2600-plus": ["stella2014"],
  atari5200: ["a5200"],
  atari7800: ["prosystem"],
  "c-plus-4": ["vice_xplus4"],
  c64: ["vice_x64sc", "vice_x64"],
  cpet: ["vice_xpet"],
  "commodore-64c": ["vice_x64sc", "vice_x64"],
  c128: ["vice_x128"],
  "commmodore-128": ["vice_x128"],
  colecovision: ["gearcoleco"],
  doom: ["prboom"],
  dos: ["dosbox_pure"],
  jaguar: ["virtualjaguar"],
  lynx: ["handy"],
  "atari-lynx-mkii": ["handy"],
  "neo-geo-pocket": ["mednafen_ngp"],
  "neo-geo-pocket-color": ["mednafen_ngp"],
  nes: ["fceumm", "nestopia"],
  famicom: ["fceumm", "nestopia"],
  fds: ["fceumm", "nestopia"],
  "game-televisison": ["fceumm"],
  "new-style-nes": ["fceumm"],
  n64: ["mupen64plus_next", "parallel_n64"],
  "ique-player": ["mupen64plus_next"],
  nds: ["melonds", "desmume", "desmume2015"],
  "nintendo-ds-lite": ["melonds", "desmume", "desmume2015"],
  "nintendo-dsi": ["melonds", "desmume", "desmume2015"],
  "nintendo-dsi-xl": ["melonds", "desmume", "desmume2015"],
  gb: ["gambatte", "mgba"],
  "game-boy-pocket": ["gambatte", "mgba"],
  "game-boy-light": ["gambatte", "mgba"],
  gba: ["mgba"],
  "game-boy-adavance-sp": ["mgba"],
  "game-boy-micro": ["mgba"],
  gbc: ["gambatte", "mgba"],
  "pc-fx": ["mednafen_pcfx"],
  psx: ["pcsx_rearmed", "mednafen_psx_hw"],
  "philips-cd-i": ["same_cdi"],
  psp: ["ppsspp"],
  segacd: ["genesis_plus_gx", "picodrive"],
  sega32: ["picodrive"],
  gamegear: ["genesis_plus_gx"],
  sms: ["genesis_plus_gx"],
  "sega-mark-iii": ["genesis_plus_gx"],
  "sega-game-box-9": ["genesis_plus_gx"],
  "sega-master-system-ii": ["genesis_plus_gx", "smsplus"],
  "master-system-super-compact": ["genesis_plus_gx"],
  "master-system-girl": ["genesis_plus_gx"],
  genesis: ["genesis_plus_gx"],
  "sega-mega-drive-2-slash-genesis": ["genesis_plus_gx"],
  "sega-mega-jet": ["genesis_plus_gx"],
  "mega-pc": ["genesis_plus_gx"],
  "tera-drive": ["genesis_plus_gx"],
  "sega-nomad": ["genesis_plus_gx"],
  saturn: ["yabause"],
  snes: ["snes9x"],
  sfam: ["snes9x"],
  "super-nintendo-original-european-version": ["snes9x"],
  "super-famicom-shvc-001": ["snes9x"],
  "super-famicom-jr-model-shvc-101": ["snes9x"],
  "new-style-super-nes-model-sns-101": ["snes9x"],
  tg16: ["mednafen_pce"],
  "turbografx-cd": ["mednafen_pce"],
  supergrafx: ["mednafen_pce"],
  "vic-20": ["vice_xvic"],
  virtualboy: ["beetle_vb"],
  wonderswan: ["mednafen_wswan"],
  swancrystal: ["mednafen_wswan"],
  "wonderswan-color": ["mednafen_wswan"],
  zxs: ["fuse"],
};

// Sega systems share cores, so the on-screen pad layout is set explicitly.
const EJS_CONTROL_SCHEMES: Record<string, string> = {
  segacd: "segaCD",
  sega32: "sega32x",
  gamegear: "segaGG",
  sms: "segaMS",
  "sega-mark-iii": "segaMS",
  "sega-master-system-ii": "segaMS",
  "master-system-super-compact": "segaMS",
  "master-system-girl": "segaMS",
  genesis: "segaMD",
  "sega-mega-drive-2-slash-genesis": "segaMD",
  "sega-mega-jet": "segaMD",
  "mega-pc": "segaMD",
  "tera-drive": "segaMD",
  "sega-nomad": "segaMD",
  saturn: "segaSaturn",
};

// These cores only ship as threaded builds. Threads need SharedArrayBuffer,
// which requires a cross-origin isolated page that an in-app WebView cannot
// provide, so they are handed off to the system browser instead.
const THREADED_CORES = new Set(['dosbox_pure', 'ppsspp', 'azahar']);

export interface EmulationSupport {
  /** Core to boot, or null when the platform has no EmulatorJS core. */
  core: string | null;
  controlScheme: string | null;
  /** True when the core cannot run inside the in-app WebView. */
  needsBrowser: boolean;
}

export const getEmulationSupport = (platformSlug: string | undefined | null): EmulationSupport => {
  const slug = (platformSlug ?? '').toLowerCase();
  const core = EJS_CORES[slug]?.[0] ?? null;
  return {
    core,
    controlScheme: EJS_CONTROL_SCHEMES[slug] ?? null,
    needsBrowser: core !== null && THREADED_CORES.has(core),
  };
};

// RoMM bundles EmulatorJS; the CDN is only a fallback for servers without it.
// The fallback is pinned to a fixed release: that script runs in a page that
// holds the session token, so it must not change underneath the app.
export const EJS_DATA_PATHS = ['/assets/emulatorjs/data/', 'https://cdn.emulatorjs.org/4.2.3/data/'];
