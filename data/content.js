window.SITE = {
  name: "Enzo Jacinto",
  status: "En recherche de stage (avril 2027)",
  city: "Béziers",
  timezone: "Europe/Paris",

  intro: "Vidéaste et créateur multimédia : tournage, montage, post-production. Étudiant en BUT MMI à l'IUT de Béziers, je cherche un stage de 11 semaines à partir d'avril 2027.",

  showreel: "",

  manifesto: "Je raconte des *histoires avec des images.* Une affiche qui arrête le regard, un court métrage qui reste en tête, une vidéo qu'on regarde *jusqu'au bout.*",

  stats: [
    { label: "Vues sur TikTok", value: "3,8M" },
    { label: "Likes en 4 mois", value: "450k" },
    { label: "Prix remportés", value: "02" },
    { label: "Langues parlées", value: "03" },
  ],

  categories: { graphisme: "Graphisme", audiovisuel: "Audiovisuel", reseaux: "Réseaux", jeu: "Jeu vidéo" },

  projects: [
    { title: "Le Prix du Silence", category: "audiovisuel", year: 2025, role: "Coréalisation, caméra principale, montage et sound design",
      description: "Un court métrage fait en deux temps : une semaine de brainstorming et de storyboard, puis le découpage technique, le tournage et le montage. Je l'ai coréalisé avec Lucas Bousquet et j'étais à la caméra principale ; j'ai aussi monté le film et créé son sound design avec Alix Nasri. Et je joue dedans.",
      tagline: "Un thriller en clair-obscur, où se taire a un prix.", tools: "CapCut, Premiere Pro, DaVinci Resolve",
      challenge: "Tenir une durée imposée dans un temps limité, sans rien sacrifier à l'ambiance : chaque étape, de l'écriture au montage, avait sa date butoir.",
      thumb: "https://i.ytimg.com/vi/t7xoHnSMMEM/maxres1.jpg", video: "https://youtu.be/t7xoHnSMMEM" },
    { title: "Zang, soda futuriste", category: "graphisme", year: 2026, role: "Tout : recherches, moodboard et affiche",
      description: "De l'histoire de l'art à la direction artistique : partir d'un mouvement, ici le futurisme italien (1909-1944), comprendre son histoire et ses codes, puis s'en servir pour une création d'aujourd'hui. J'ai d'abord présélectionné des œuvres, des textures, des typographies, des couleurs et des citations, entre le futurisme d'époque et un néo-futurisme numérique, puis composé un moodboard. Il a guidé l'affiche finale, au format A3, pour Zang, un soda futuriste inventé pour l'occasion.",
      tagline: "Une canette rugissante est plus belle que la Victoire de Samothrace.", tools: "Photoshop",
      challenge: "Trier sans tout garder : 18 visuels présélectionnés pour 6 retenus, 12 couleurs pour 6, 3 typographies pour une seule, pour qu'un mouvement de 1909 parle encore aujourd'hui.",
      thumb: "assets/projets/zang/vignette.jpg",
      media: ["assets/projets/zang/affiche.jpg", "assets/projets/zang/moodboard.jpg", "assets/projets/zang/preselection.jpg"] },
    { title: "Motion design alternance", category: "audiovisuel", year: 2026, role: "Tout : storyboard, animation et montage",
      description: "Une vidéo en motion design d'au moins trente secondes, pour promouvoir le recrutement d'étudiants en alternance. J'ai tout réalisé seul, du storyboard dessiné sur Photoshop jusqu'à l'animation et au montage sur After Effects.",
      tagline: "Trente secondes pour donner envie de recruter en alternance.", tools: "After Effects, Photoshop (storyboard)",
      challenge: "Faire passer un message clair et donner envie en une trentaine de secondes, en portant seul chaque étape, du premier croquis au rendu final.",
      thumb: "https://i.ytimg.com/vi/qFRErBEHR60/maxres1.jpg", video: "https://youtu.be/qFRErBEHR60",
      media: ["assets/projets/motion-design/storyboard.jpg"] },
    { title: "Europe en 2100", category: "audiovisuel", year: 2026, role: "Réalisation complète : tournage et montage",
      description: "La publicité d'Europe en 2100, un jeu de cartes fictif. J'en ai assuré toute la réalisation. Le jeu devait être fini, et sa version physique prête, avant qu'on puisse filmer : j'ai donc tourné la veille de l'oral de présentation, puis monté toute la pub dans la soirée.",
      tagline: "Une pub tournée en vingt minutes, montée en une soirée.", tools: "CapCut, Premiere Pro",
      challenge: "Tout boucler la veille de l'oral : un tournage de vingt minutes avec des moyens très limités, puis le montage complet en une soirée.",
      thumb: "", video: "https://youtu.be/5sEIh1vjJG0" },
    { title: "Dusk and Dawn", category: "jeu", year: 2026, role: "Le combat et la progression, puis la plus grande partie du reste, en équipe de trois",
      description: "Un jeu d'arcade fait en deux semaines pour la borne du BUT MMI de Béziers, sur le thème ombre et lumière. Au centre de la carte, le temple de l'aube garde la dernière flamme, et les ombres arrivent par vagues pour l'éteindre. Seul ou à deux, en chevalier ou en mage, on tient le plus longtemps possible en choisissant ses bonus à chaque niveau. Je l'ai fait avec Alexandre Villiers et Benjamin Granier.",
      tagline: "Ici, la lumière est une barre de vie.", tools: "Phaser 3, JavaScript, Tiled",
      challenge: "Au premier test sur la borne, le jeu tournait à 10 images par seconde. On l'a optimisé de fond en comble (le sol dessiné une seule fois, les ténèbres calculées au quart de la résolution, une carte plus petite, des musiques plus légères) : au second test, il tournait sans ramer.",
      thumb: "https://enzo-jct.github.io/dusk-and-dawn/presentation.png", play: "https://enzo-jct.github.io/dusk-and-dawn/",
      controls: "Au clavier : les flèches pour bouger, I pour valider, O pour la pause ; l'attaque est automatique. À deux : Z Q S D, R et T.",
      link: "https://enzo-jct.github.io/dusk-and-dawn/",
      media: [
        "assets/projets/dusk-and-dawn/gdd-01.jpg", "assets/projets/dusk-and-dawn/gdd-02.jpg", "assets/projets/dusk-and-dawn/gdd-03.jpg", "assets/projets/dusk-and-dawn/gdd-04.jpg",
        "assets/projets/dusk-and-dawn/gdd-05.jpg", "assets/projets/dusk-and-dawn/gdd-06.jpg", "assets/projets/dusk-and-dawn/gdd-07.jpg", "assets/projets/dusk-and-dawn/gdd-08.jpg",
        "assets/projets/dusk-and-dawn/gdd-09.jpg", "assets/projets/dusk-and-dawn/gdd-10.jpg", "assets/projets/dusk-and-dawn/gdd-11.jpg", "assets/projets/dusk-and-dawn/gdd-12.jpg",
        "assets/projets/dusk-and-dawn/gdd-13.jpg", "assets/projets/dusk-and-dawn/gdd-14.jpg", "assets/projets/dusk-and-dawn/gdd-15.jpg", "assets/projets/dusk-and-dawn/gdd-16.jpg",
      ] },
    { title: "Ensedune", category: "audiovisuel", year: 2026, role: "Concept et idées, réalisation des plans, transitions",
      description: "Une publicité de quarante-quatre secondes pour Ensedune, un vin. En équipe, j'ai mené le brainstorming, et l'essentiel des idées vient de moi. J'ai aussi aidé à réaliser les plans, avec l'aide du professeur, et imaginé les transitions du montage.",
      tagline: "D'un tracteur en jouet à la vigne : l'enfant est devenu vigneron.", tools: "DaVinci Resolve, Premiere Pro",
      challenge: "Raconter une histoire complète en quarante-quatre secondes, en faisant passer l'enfant au vigneron par les transitions.",
      thumb: "", video: "https://youtu.be/0l2j02BS3Kk" },
    { title: "Compte TikTok", category: "reseaux", year: 2024, role: "Créateur de contenu",
      description: "Un compte anglophone sur les jeux vidéo et les mangas, tenu pendant quatre mois en 2024 : 3,8 millions de vues et 450 000 likes. Le concept, original : des slideshows qui surfent sur une tendance du moment, appliqués aux personnages de jeux vidéo et de mangas, avec des edits et des montages courts.",
      tagline: "3,8 millions de vues en quatre mois, 100 % en anglais.", tools: "",
      challenge: "Tout faire de bout en bout, en anglais : la conception, le montage, la publication et l'analyse des performances.",
      thumb: "", link: "" },
  ],

  services: [
    { title: "Vidéo", text: "Tournage, montage et post-production, en formats courts comme en formats longs, de la prise de vue au fichier final." },
    { title: "Réseaux sociaux", text: "Community management et contenus qui surfent sur les tendances, de l'idée à l'analyse des performances." },
    { title: "Graphisme & DA", text: "La direction artistique et les visuels qui accompagnent les vidéos, sur Photoshop, Illustrator et Figma." },
  ],

  tools: ["Premiere Pro", "After Effects", "DaVinci Resolve", "CapCut", "Photoshop", "Illustrator", "Figma", "InDesign (notions)"],

  code: "Du vibe coding : assez pour suivre une équipe de devs et trouver des solutions avec elle.",

  email: "enzojacinto.pro@gmail.com",
  socials: [
    { label: "Instagram", url: "https://www.instagram.com/enzo.jct_/" },
    { label: "LinkedIn", url: "https://www.linkedin.com/in/enzo-jacinto" },
    { label: "GitHub", url: "https://github.com/Enzo-jct" },
  ],

  v3d: {
    plongee: "Sous la surface, il y a des histoires.",
    roles: ["Monteur", "Vidéaste", "Graphiste"],
    about: "Du rush au récit.",
    contact: "On lance la lecture ?",
    contactText: "Un stage, un projet, un clip à monter : écris-moi.",
  },
};
