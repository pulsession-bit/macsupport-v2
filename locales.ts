
import { Language } from './types';

interface AppItem {
  name: string;
  desc: string;
  action: string;
  category: 'system' | 'expert';
  tag: string;
}

interface Translation {
  title: string;
  nav: {
    live: string;
    apps: string;
    install: string;
  };
  status: {
    connected: string;
    connecting: string;
    error: string;
    disconnected: string;
  };
  video: {
    disabled: string;
    noCamera: string;
    audioActive: string;
  };
  welcome: {
    title: string;
    subtitle: string;
    button: string;
  };
  apps: {
    title: string;
    subtitle: string;
    categories: {
      system: string;
      expert: string;
    };
    list: AppItem[];
  };
  errors: {
    connection: string;
    permissions: string;
    generic: string;
    close: string;
  };
  visualizer: {
    agent: string;
    user: string;
  };
  controls: {
    mute: string;
    unmute: string;
    disableCamera: string;
    enableCamera: string;
    noCamera: string;
    screenshot: string;
    hangup: string;
    ready: string;
    capturing: string;
  };
}

export const translations: Record<Language, Translation> = {
  fr: {
    title: "VESTEE ASSISTANCE",
    nav: {
      live: "Support Live",
      apps: "App Center",
      install: "Installer l'App"
    },
    status: {
      connected: "En ligne",
      connecting: "Connexion...",
      error: "Erreur",
      disconnected: "Déconnecté"
    },
    video: {
      disabled: "Caméra désactivée",
      noCamera: "Aucune caméra détectée",
      audioActive: "L'audio reste actif"
    },
    welcome: {
      title: "Diagnostic Expert en Temps Réel",
      subtitle: "Je suis Agent Vestee. Connectez-vous à votre compte professionnel pour un accès illimité au diagnostic.",
      button: "Se Connecter"
    },
    apps: {
      title: "App Store Support",
      subtitle: "Votre centre de micro-applications pour le dépannage.",
      categories: {
        system: "Outils macOS Natifs",
        expert: "Apps de Diagnostic"
      },
      list: [
        { name: "Utilitaire de Disque", desc: "Scan et réparation des partitions SSD Apple.", action: "Installer", category: 'system', tag: 'Native' },
        { name: "Terminal", desc: "Console d'administration sécurisée via ADB/SSH.", action: "Lancer", category: 'system', tag: 'System' },
        { name: "Activity Monitor", desc: "Analyse des ressources et kill de processus.", action: "Lancer", category: 'system', tag: 'Perf' },
        { name: "CleanMyMac", desc: "Optimisation de l'espace et vidage de cache.", action: "Guide", category: 'expert', tag: 'Expert' },
        { name: "Malwarebytes", desc: "Sécurité Android & Mac couplée.", action: "Infos", category: 'expert', tag: 'Shield' },
        { name: "EtreCheck Pro", desc: "Analyse profonde de l'architecture matérielle.", action: "Infos", category: 'expert', tag: 'Hardware' }
      ]
    },
    errors: {
      connection: "Erreur réseau. Vérifiez votre Wi-Fi.",
      permissions: "Accès caméra requis pour le diagnostic.",
      generic: "Erreur",
      close: "Fermer"
    },
    visualizer: {
      agent: "AGENT VESTEE",
      user: "VOUS"
    },
    controls: {
      mute: "Muet",
      unmute: "Parler",
      disableCamera: "Vidéo Off",
      enableCamera: "Vidéo On",
      noCamera: "Pas de caméra",
      screenshot: "Capture Analyse",
      hangup: "Terminer",
      ready: "Prêt",
      capturing: "Analyse en cours..."
    }
  },
  en: {
    title: "VESTEE ASSISTANCE",
    nav: {
      live: "Live Support",
      apps: "App Center",
      install: "Install App"
    },
    status: {
      connected: "Online",
      connecting: "Connecting...",
      error: "Error",
      disconnected: "Disconnected"
    },
    video: {
      disabled: "Camera disabled",
      noCamera: "No camera detected",
      audioActive: "Audio remains active"
    },
    welcome: {
      title: "Real-Time Expert Diagnostics",
      subtitle: "I am Agent Vestee. Log in to your professional account for unlimited diagnostic access.",
      button: "Log In"
    },
    apps: {
      title: "App Store Support",
      subtitle: "Your command center for troubleshooting micro-apps.",
      categories: {
        system: "Native macOS Tools",
        expert: "Diagnostic Apps"
      },
      list: [
        { name: "Disk Utility", desc: "Scan and repair Apple SSD partitions.", action: "Install", category: 'system', tag: 'Native' },
        { name: "Terminal", desc: "Secure admin console via ADB/SSH.", action: "Launch", category: 'system', tag: 'System' },
        { name: "Activity Monitor", desc: "Resource analysis and process management.", action: "Launch", category: 'system', tag: 'Perf' },
        { name: "CleanMyMac", desc: "Space optimization and cache clearing.", action: "Guide", category: 'expert', tag: 'Expert' },
        { name: "Malwarebytes", desc: "Coupled Android & Mac security.", action: "Info", category: 'expert', tag: 'Shield' },
        { name: "EtreCheck Pro", desc: "Deep hardware architecture analysis.", action: "Info", category: 'expert', tag: 'Hardware' }
      ]
    },
    errors: {
      connection: "Network error. Check Wi-Fi.",
      permissions: "Camera access required for diagnosis.",
      generic: "Error",
      close: "Close"
    },
    visualizer: {
      agent: "AGENT VESTEE",
      user: "YOU"
    },
    controls: {
      mute: "Mute",
      unmute: "Unmute",
      disableCamera: "Video Off",
      enableCamera: "Video On",
      noCamera: "No Camera",
      screenshot: "Capture Scan",
      hangup: "End",
      ready: "Ready",
      capturing: "Analyzing..."
    }
  },
  de: {
    title: "VESTEE ASSISTANCE",
    nav: {
      live: "Live Support",
      apps: "App-Zentrum",
      install: "App installieren"
    },
    status: {
      connected: "Online",
      connecting: "Verbinden...",
      error: "Fehler",
      disconnected: "Getrennt"
    },
    video: {
      disabled: "Kamera aus",
      noCamera: "Keine Kamera",
      audioActive: "Audio aktiv"
    },
    welcome: {
      title: "Echtzeit-Diagnose",
      subtitle: "Ich bin Agent Vestee. Bitte loggen Sie sich ein, um unbegrenzten Support zu erhalten.",
      button: "Anmelden"
    },
    apps: {
      title: "App Store Support",
      subtitle: "Ihr Kommandozentrum für Diagnose-Apps.",
      categories: {
        system: "Nativ macOS",
        expert: "Experten-Apps"
      },
      list: [
        { name: "Festplattendienst", desc: "SSD-Partitionen scannen und reparieren.", action: "Installieren", category: 'system', tag: 'Native' },
        { name: "Terminal", desc: "Sichere Konsole via ADB/SSH.", action: "Starten", category: 'system', tag: 'System' },
        { name: "Aktivitätsanzeige", desc: "Ressourcenanalyse und Verwaltung.", action: "Starten", category: 'system', tag: 'Perf' },
        { name: "CleanMyMac", desc: "Speicheroptimierung und Reinigung.", action: "Guide", category: 'expert', tag: 'Expert' },
        { name: "Malwarebytes", desc: "Android & Mac Sicherheit.", action: "Info", category: 'expert', tag: 'Shield' },
        { name: "EtreCheck Pro", desc: "Hardware-Architekturanalyse.", action: "Info", category: 'expert', tag: 'Hardware' }
      ]
    },
    errors: {
      connection: "Netzwerkfehler.",
      permissions: "Kamerazugriff erforderlich.",
      generic: "Fehler",
      close: "Schließen"
    },
    visualizer: {
      agent: "AGENT VESTEE",
      user: "SIE"
    },
    controls: {
      mute: "Stumm",
      unmute: "An",
      disableCamera: "Video Aus",
      enableCamera: "Video An",
      noCamera: "Keine Kamera",
      screenshot: "Analyse-Scan",
      hangup: "Ende",
      ready: "Bereit",
      capturing: "Analysiere..."
    }
  },
  th: {
    title: "VESTEE ASSISTANCE",
    nav: {
      live: "สนับสนุนสด",
      apps: "ศูนย์แอป",
      install: "ติดตั้งแอป"
    },
    status: {
      connected: "ออนไลน์",
      connecting: "กำลังเชื่อมต่อ...",
      error: "ข้อผิดพลาด",
      disconnected: "ตัดการเชื่อมต่อ"
    },
    video: {
      disabled: "ปิดกล้อง",
      noCamera: "ไม่พบกล้อง",
      audioActive: "เสียงทำงานอยู่"
    },
    welcome: {
      title: "การวินิจฉัยแบบเรียลไทม์",
      subtitle: "ฉันคือ Agent Vestee โปรดลงชื่อเข้าใช้บัญชีมืออาชีพของคุณเพื่อเข้าถึงการวินิจฉัยไม่จำกัด",
      button: "ลงชื่อเข้าใช้"
    },
    apps: {
      title: "App Store Support",
      subtitle: "ศูนย์บัญชาการไมโครแอปสำหรับการแก้ปัญหาของคุณ",
      categories: {
        system: "เครื่องมือ macOS ดั้งเดิม",
        expert: "แอปวินิจฉัย"
      },
      list: [
        { name: "ยูทิลิตี้ดิสก์", desc: "สแกนและซ่อมแซมพาร์ติชัน Apple SSD", action: "ติดตั้ง", category: 'system', tag: 'Native' },
        { name: "เทอร์มินัล", desc: "คอนโซลผู้ดูแลระบบที่ปลอดภัยผ่าน ADB/SSH", action: "เปิด", category: 'system', tag: 'System' },
        { name: "ตัวตรวจสอบกิจกรรม", desc: "การวิเคราะห์ทรัพยากรและการจัดการกระบวนการ", action: "เปิด", category: 'system', tag: 'Perf' },
        { name: "CleanMyMac", desc: "การเพิ่มประสิทธิภาพพื้นที่และการล้างแคช", action: "คำแนะนำ", category: 'expert', tag: 'Expert' },
        { name: "Malwarebytes", desc: "ความปลอดภัยของ Android และ Mac รวมกัน", action: "ข้อมูล", category: 'expert', tag: 'Shield' },
        { name: "EtreCheck Pro", desc: "การวิเคราะห์สถาปัตยกรรมฮาร์ดแวร์เชิงลึก", action: "ข้อมูล", category: 'expert', tag: 'Hardware' }
      ]
    },
    errors: {
      connection: "ข้อผิดพลาดเครือข่าย",
      permissions: "ต้องเข้าถึงกล้องเพื่อวินิจฉัย",
      generic: "ข้อผิดพลาด",
      close: "ปิด"
    },
    visualizer: {
      agent: "AGENT VESTEE",
      user: "คุณ"
    },
    controls: {
      mute: "ปิดเสียง",
      unmute: "เปิดเสียง",
      disableCamera: "ปิดวิดีโอ",
      enableCamera: "เปิดวิดีโอ",
      noCamera: "ไม่พบกล้อง",
      screenshot: "สแกนวิเคราะห์",
      hangup: "วางสาย",
      ready: "พร้อม",
      capturing: "กำลังวิเคราะห์..."
    }
  }
};
