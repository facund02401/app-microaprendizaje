import type { Book } from "@/types";

/**
 * LIBRO DE PRUEBA — contenido íntegramente inventado para el MVP estático.
 * No citar obras reales: el material del usuario se cargará en Fase 2.
 */
export const mockBook: Book = {
  documentId: "texto-de-prueba",
  title: "Cuadernos de teoría (texto de prueba)",
  author: "Autor de Ejemplo",
  chapters: [
    {
      id: "cap-1",
      title: "Capítulo 1 · La fuerza y su representación",
      nodes: [
        {
          orderIndex: 1,
          title: "El concepto de fuerza propia",
          excerptParagraphs: [
            "Llamamos fuerza propia a ese empuje continuo que no puede confundirse con un reflejo. El reflejo responde a un estímulo externo y se agota en su respuesta; la fuerza propia, en cambio, no necesita provocación: opera de modo constante, aunque admita variaciones de intensidad. Por eso resulta inútil buscar su origen en el mundo de los objetos; hay que rastrearla, más bien, en el interior del organismo que la sostiene.",
            "Esta distinción no es un detalle terminológico. Si confundimos ambos registros, arrastramos un error de fondo: creeremos que basta retirar el estímulo para que la fuerza ceda, y descubriremos, tarde o temprano, que la fuerza persiste incluso cuando todo lo que la rodeaba ha cambiado. La consecuencia práctica es doble: por un lado, ciertas formaciones no se disuelven por simple exposición a la realidad; por el otro, toda teoría que pretenda explicarlas necesitará un vocabulario propio, distinto del vocabulario del estímulo y la respuesta.",
            "Conviene subrayar, finalmente, el estatuto de este concepto. No se trata de una sustancia observable ni de una medida de laboratorio, sino de una construcción teórica cuya validez se juega en su capacidad para ordenar fenómenos dispersos bajo una misma ley de funcionamiento. Su utilidad no está en lo que muestra, sino en lo que permite pensar.",
          ],
          contextGlossary: [
            {
              term: "fuerza propia",
              definition:
                "Empuje interno y constante, independiente del estímulo externo. Concepto límite de esta serie de cuadernos.",
            },
            {
              term: "estatuto de concepto",
              definition:
                "Modo de existencia de una noción teórica: no describe hechos observables, sino que organiza su inteligibilidad.",
            },
          ],
          reflectionPrompt:
            "¿Qué fenómenos de tu práctica se explican mejor por una fuerza persistente que por una respuesta a estímulos? Desarrollá un ejemplo.",
        },
        {
          orderIndex: 2,
          title: "Representación: la cara legible del proceso",
          excerptParagraphs: [
            "Toda fuerza deja huella, pero no toda huella es imagen. Llamamos representación al modo en que un proceso interno deviene perceptible, ya sea como escena, como palabra o como afecto. La representación no copia: selecciona, comprime, desplaza. Entre el proceso y aquello que lo expresa media una operación de traducción cuyas reglas conviene estudiar.",
            "La primera regla es económica: la representación tiende al camino corto. Prefiere lo visual a lo abstracto, lo concreto a lo general, el caso singular a la ley. De ahí que las producciones donde se lee el proceso aparezcan, casi siempre, vestidas de anécdota. La segunda regla es de compromiso: la representación debe ser suficientemente clara para ser percibida y suficientemente ambigua para no despertar resistencia. Todo lo expresado negocia, en cada instancia, entre estas dos exigencias.",
            "Si aceptamos estas reglas, cambia también nuestra manera de leer. Un texto denso no es un obstáculo opaco sino una cadena de traducciones que podemos reconstruir. Preguntarse qué proceso fue traducido aquí, y por qué esta vía y no otra, es el gesto metodológico fundamental que estos cuadernos intentan entrenar.",
          ],
          contextGlossary: [
            {
              term: "representación",
              definition:
                "Forma perceptible (imagen, palabra, afecto) que adopta un proceso interno; no lo copia, lo traduce.",
            },
          ],
          reflectionPrompt:
            "Elegí una idea difícil que hayas estudiado: ¿por qué vía llegó a hacerse pensable para vos?",
        },
        {
          orderIndex: 3,
          title: "Del síntoma al compromiso estructural",
          excerptParagraphs: [
            "Un malestar localizado nunca es solo un accidente. En la serie de fenómenos que estudiamos, el episodio visible funciona como solución provisional de un conflicto más amplio: es un compromiso entre la fuerza que pide paso y las condiciones que le niegan la salida. Entenderlo así invierte la pregunta habitual: no buscamos qué causó el episodio, sino qué equilibrio sostiene.",
            "Esta inversión tiene consecuencias clínicas y teóricas. Clínicamente, porque atacar el episodio sin tocar el equilibrio suele producir desplazamientos: el malestar cede aquí y reaparece allá. Teóricamente, porque obliga a pensar la estructura como una economía de posiciones antes que como una colección de rasgos. Lo que llamamos estructura no es una forma fija, sino una manera estable de distribuir tensiones.",
            "Cada estructura, entonces, puede describirse por su modo característico de comprometer: qué cede, qué se conserva, qué se silencia. Esa descripción exige tiempo y paciencia interpretativa, pero evita dos errores simétricos: el optimismo que cree disolver el conflicto con información, y el pesimismo que lo declara incurable por definición.",
          ],
          contextGlossary: [
            {
              term: "compromiso",
              definition:
                "Solución provisional de un conflicto: combina satisfacción parcial de la fuerza y conservación del equilibrio.",
            },
            {
              term: "economía psíquica",
              definition:
                "Metáfora que concibe la vida anímica como distribución y intercambio de cantidades finitas.",
            },
          ],
          reflectionPrompt:
            "Pensá una situación donde un cambio superficial no modificó el problema de fondo: ¿qué equilibrio seguía operando?",
        },
      ],
    },
    {
      id: "cap-2",
      title: "Capítulo 2 · Los destinos del concepto",
      nodes: [
        {
          orderIndex: 4,
          title: "La genealogía de los términos",
          excerptParagraphs: [
            "Los conceptos no nacen terminados: viajan, se corrigen, cambian de nombre sin cambiar siempre de contenido, o cambian de contenido conservando el nombre. Reconstruir esa trayectoria —su genealogía— es condición para no usarlos a ciegas. Un término arranca de una distinción precisa, se generaliza en manos de discípulos, y a veces retorna a su rigor inicial gracias a una crítica puntual.",
            "La genealogía importa porque los malentendidos también heredan. Cuando una noción circula sin su historia, arrastra sentidos contradictorios que sus usuarios ya no pueden distinguir. Dos interlocutores emplean la misma palabra y discuten sin saber que hablan de cosas distintas. El trabajo conceptual comienza, muchas veces, por restituir la diferencia que el uso borroso había cancelado.",
            "Proponemos entonces una regla de lectura: ante cada término técnico, preguntarse contra quién se acuñó, contra qué confusión previa. Los conceptos son respuestas; conocer la pregunta original es el modo más económico de saber qué responden y qué no prometen resolver.",
          ],
          contextGlossary: [
            {
              term: "genealogía",
              definition:
                "Reconstrucción de la trayectoria histórica de un concepto: acuñación, desplazamientos, retornos.",
            },
          ],
          reflectionPrompt:
            "¿Algún término de tu campo cuyo uso cotidiano haya borrado la distinción que lo originó?",
        },
        {
          orderIndex: 5,
          title: "Traducción y pérdida en el pasaje entre marcos",
          excerptParagraphs: [
            "Ningún marco teórico es autosuficiente: todos necesitan dialogar con vecinos rivales. En ese diálogo ocurre algo instructivo: cuando un concepto emigra de un marco a otro, conserva su nombre y altera su función. La palabra llega intacta; lo que no llega es la red de otras palabras que sostenían su sentido.",
            "Por eso toda comparación entre marcos exige un doble movimiento: explicitar lo que el concepto importado pierde, y explicitar lo que el marco receptor agrega. Las polémicas estériles suelen provenir de saltarse ese examen: se discute la palabra mientras las funciones difieren en silencio. Las fecundas, en cambio, tratan cada préstamo como un experimento controlado.",
            "Este capítulo propone una disciplina sencilla: antes de afirmar equivalencias, listar condiciones de uso. Si dos nociones comparten nombre pero divergen en tres condiciones, la equivalencia es retórica. Si divergen en nombre pero coinciden en todas las condiciones relevantes, tenemos un hallazgo: dos tradiciones descubrieron el mismo pliegue del objeto.",
          ],
          contextGlossary: [
            {
              term: "marco teórico",
              definition:
                "Red articulada de conceptos y reglas que define qué preguntas tienen sentido y qué cuenta como respuesta.",
            },
            {
              term: "condiciones de uso",
              definition:
                "Lista explícita de situaciones, restricciones y objetivos bajo los cuales un concepto aplica.",
            },
          ],
          reflectionPrompt:
            "Contá un préstamo de idea entre dos marcos distintos que hayas presenciado: ¿qué se perdió y qué se ganó?",
        },
        {
          orderIndex: 6,
          title: "Cierre provisorio: la densidad crítica",
          excerptParagraphs: [
            "Estos cuadernos defendieron una tesis discreta: la comprensión de una obra no comienza por la lectura lineal sino por la adquisición de una densidad mínima de conceptos articulados entre sí. Antes del umbral, cada página cansa y nada permanece; después del umbral, las mismas páginas se vuelven sorprendentemente fluidas, porque cada frase encuentra red donde apoyarse.",
            "La pedagogía que se desprende de esto es contraintuitiva: conviene demorar el texto completo y trabajar primero fragmentos elegidos por su carga conceptual, hasta que la red alcanza densidad suficiente. Recién entonces la lectura corrida deja de ser un acto de resistencia y deviene lo que siempre debió ser: un placer riguroso.",
            "Queda abierto, naturalmente, el problema del criterio: ¿cuándo se alcanzó el umbral? Proponemos un indicador empírico: cuando el lector puede anticipar, con probabilidad razonable, qué tipo de argumento aparecerá después de una transición. Esa capacidad de anticipación —no la cantidad de páginas acumuladas— es la señal de que el andamiaje cumplió su función y puede retirarse.",
          ],
          contextGlossary: [
            {
              term: "densidad crítica",
              definition:
                "Umbral de conceptos articulados a partir del cual la lectura completa de una obra se vuelve fluida.",
            },
          ],
          reflectionPrompt:
            "Recordá un texto que primero te resultó impenetrable y luego fluido: ¿qué cambió en tu red de conceptos?",
        },
      ],
    },
  ],
};
