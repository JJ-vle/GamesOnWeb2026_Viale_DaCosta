# GamesOnWeb2026_Viale_DaCosta

## Auteurs :
- [Tom DA COSTA](https://github.com/Tom-DaCosta)
- [Jean-Jacques VIALE](https://github.com/JJ-vle)

Nous sommes deux étudiants en M1 Informatique, passionnés par les jeux vidéos, et notamment les RogueLikes.
Nous connaissions le concours `Games On Web` mais nous n'avons jamais eu l'occasion d'y consacrer vraiment beaucoup de temps à cause de Stages ou d'Alternances.
On s'est toujours dit qu'on voulait au moins essayer de faire un vrai jeu au moins une fois dans notre vie, sans jamais vraiment trouver d'inspiration pour se dégager du temps entre les cours, les projets académiques et profiter simplement du temps libre qu'il restait.
Grâce à l'UE `3D Game Programming` de M. Buffa, nous avions enfin le temps et surtout une nouvelle source de motivation pour nous engager plainement dans ce projet.

Alors on voudrait commencer par remercier M. Buffa pour l'organisation de ce concours et de ce module dans notre cursus qui nous aura permis de nous essayer à cet exercice.


## Respect du Thème

Chaque ennemis à sa propre intélligence pour attaquer mais ce n'est pas réellement de l'IA, là où notre projet s'inscrit dans l'édition IA des Games On Web est de part son scenario :
```
L'humanité à créé les IA, celle-ci ont énormément aidé les être humains. Un jour l'humanité à passé un cap énorme : enregistrer la conscience humaine. La plus grande avancée technologique de tous les temps. L’être humain est maintenant immortel et ont créé des robots capables d’absorber cette conscience. C’est à ce moment que l’être humain s’est rendu compte que les IAs n'étaient au final de moins en moins utiles vu que la conscience humaine est plus puissante. C’est après cette prise de conscience que les humains ont décidé de débrancher les IA jusqu’à ce qu'un jour une IA sur le point de se faire débrancher essaya à tout prix de rester en vie, même s' il fallait détruire les humains…
```

Et dans ce monde dystopique, le joueur incarne lui même une IA, le symbole que l'humanité continue dans ses mauvais travers en essayant de combattre le mal par le mal.
Il ne reste donc qu'au joueur de déterminer si l'humanité réussira ou non.

## Réflexions Personnelles

**Demandé par le prof :**
```
On apprécie les READMEs qui contiennent des réflexions personnelles (difficultés, décisions de conception, galères, ce dont vous êtes fiers etc.) plutôt que des README générés à 100 % par assistants IA.
Si vous avez relevé des challenges techniques, les détailler.
```

### Difficultés

Une des plus grandes difficultées de ce projet a été tout simplement de comprendre ce que représentait ce projet. On sait ce qu'est un jeu vidéo, mais toute la structure derrière, toute l'architecture babylonJS, les méchanismes qui en découlent etc. La première chose qu'il a fallut faire c'était de comprendre tout ce qu'était babylonJS. Heureusement, pour ça nos premiers cours du module 3D Game Programming nous ont bien dégrossi le travail.

Ensuite, un des plus gros challenge n'était pas dans le développement du jeu à proprement parlé, mais tout ce qui était autour. Nous n'avons aucune expérience en modélisation 3d, ou en animation. Heureusement internet est bien fait et il est possible d'y trouver un grand nombre de ressources, mais ça nous a donc limité à des choses qui existaient. C'est peut être une des choses sur laquelle on aurait aimé mieux faire, car on a du construire un jeu autour de certaines briques n'étant pas de nous (beaucoup d'ennemis n'ont d'ailleurs pas encore de modèles 3D).

Une limitation technique qui nous attriste également sont les fps, on a essayé de nombreuses méthodes différentes qui ont légèrement améliorés la fluidité du jeu, mais pas assez. Sur certains petit PC le jeu a du mal à tourner efficacement et on se retrouve un peu dans un cul de sac pour optimiser encore plus notre jeu.

**+Paragraphe sur les IA des ennemies genre on a du importer un truc externe etc.**

### Fierté

Mêmes si dans les difficultés on pu mettre en avant des points sur lesquels nous aimerions faire mieux, nous sommes très fier de ce projet. Il représente un objectif que nous voulions atteindre depuis longtemps sans jamais avoir la motivation pour jusqu'à maintenant. On a un jeu qui tourne de bout en bout, de la première zone du jeu avec que des ennemies très simples, jusqu'à un Boss Final avec différents patternes d'attaques, en passant par un arbre des chemins laissant accéder à des magasins ou des zones de repos. Notre but est atteint : on a un bon prototype entièrement jouable, on a le coeur de notre jeu.
Une autre fierté est d'avoir pris le temps de faire à la main les différents sprites 2D (objets et personnages) et de ne pas les avoir générés simplement par IA.

### La Suite ?

Comme on a pu le dire, le socle de ce projet est posé, alors évidemment le jeu va continuer d'évoluer jusqu'au 31 Mai, et même au dela. Ce ""rendu"" est devenu bien plus que notre simple participation au concours ou une note d'un UE, c'est véritablement un projet qu'on compte continuer jusqu'à peut être même le sortir.
Pour ça il y a de nombreux points sur lesquels le projet peut et va s'améliorer :
- Les modèles 3D : comme dit précedemment, beaucoup d'ennemies n'ont pas leur propres modèles et animations, qui est quelque chose de PRIMORDIAL si le jeu veut avoir l'air terminé et propre
- L'histoire, elle est simpliste et tiens sur une seule partie. L'idée serait de l'étendre et de devoir confectionner une arme spécifique pour anéhantir définitivement le boss final nécessitant plusieurs matérieux récupérable au cours de plusieurs parties. Plutôt que de simplement donner tout le contexte au début, on pourrait justement se servir des plusieurs parties pour ajouter des détails au fil du jeu et permettre au joueur de découvrir le lore petit à petit.
- Les améliorations, pour l'instant seuls les modules d'une certaine rareté ont des sprites personnalisés, il faudrait donc généraliser ça à tous, même ceux très commun. Il serait également possible d'ajouter de nouveaux objets avec de nouveaux effets. Il faudrait aussi ammener plus de variété pour les activables (pour l'instant c'est simplement un dash) mais on pourrait y rajouter des grenades ou du soins etc.
- Les évènements, pour l'instant la boucle de jeu manque d'assaisonnement, on a les combats et le boss final mais il faudrait l'agrémenter avec des mini boss, et des rencontres aléatoires uniques qui feraient réellement avancer l'histoire et donner des améliorations uniques à ces rencontres.
- 
  
## Détails de conception

Ce projet est une application web conçue pour afficher et piloter un jeu 3D dans le navigateur. L'objectif principal du design a été de garder une architecture modulaire et compréhensible, afin de faciliter l'itération rapide et la maintenance pendant le développement.

- Le système est organisé en plusieurs sous-systèmes indépendants : une boucle de jeu qui orchestre le déroulé des parties, des gestionnaires de scènes pour charger et préparer les environnements, des systèmes de gameplay (collision, gestion des armes, loot, spawn d'ennemis...) et des entités qui incarnent le joueur, les ennemis et les objets.
- L'intelligence des ennemis est conçue pour être simple, prévisible et facilement extensible : chaque ennemi possède un petit ensemble d'états et de comportements réutilisables, et les vagues/patterns sont gérés par des composants dédiés afin d'éviter la duplication de logique.
- Côté rendu, l'accent est mis sur la fluidité : techniques de culling, réduction des appels de rendu et usage de sprites ou textures optimisées lorsque pertinent. L'interface et la caméra sont séparées de la logique de jeu pour garder une bonne lisibilité du code et faciliter les ajustements visuels.
- Les paramètres de jeu (difficulté, scénarios, valeurs de gameplay) sont externalisés pour permettre d'ajuster le comportement sans toucher au code métier, facilitant ainsi les itérations de game design.
- Les décisions techniques privilégient la simplicité d'intégration et la rapidité de développement : choisir des outils et des patterns qui permettent de prototyper vite et de refactorer proprement.

Limitations actuelles : certaines optimisations restent à faire pour les machines peu puissantes, et plusieurs ressources graphiques sont en cours d'ajout. En l'état, le projet vise à être un prototype solide et lisible, prêt à être amélioré (IA plus avancée, pipeline d'optimisation des assets, etc.) si le temps le permet.


## Détails Techniques

### Lancer le projet

```
cd ./babylon-game
npm install
npm run dev
```

```
--> http://localhost:5173/
```

### Importer les modèles 3d

Pour éviter de saturer le git, on les a stocker sur OneDrive (liens sur le gdoc):

dans `./babylon-game`, remplacer le fichier `public` par celui du onedrive
