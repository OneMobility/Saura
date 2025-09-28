export interface Tour {
  id: string;
  imageUrl: string;
  title: string;
  description: string;
  price: string;
  duration: string;
  includes: string[];
  itinerary: { day: number; activity: string }[];
}

export const allTours: Tour[] = [
  {
    id: 'riviera-maya-adventure',
    imageUrl: 'https://images.unsplash.com/photo-1501785888041-af3ba6f602d8?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    title: 'Aventura en la Riviera Maya',
    description: 'Explora las ruinas mayas y relájate en las playas de arena blanca. Este tour incluye transporte, alojamiento en hoteles boutique, visitas guiadas a Chichén Itzá, Tulum y Cobá, así como tiempo libre para disfrutar de las hermosas playas de Cancún y Playa del Carmen. Disfruta de la gastronomía local y actividades acuáticas.',
    price: '$1,200 USD',
    duration: '7 días / 6 noches',
    includes: ['Transporte aéreo y terrestre', 'Alojamiento en hoteles 4 estrellas', 'Desayunos diarios', 'Guía bilingüe', 'Entradas a sitios arqueológicos'],
    itinerary: [
      { day: 1, activity: 'Llegada a Cancún, traslado al hotel y tarde libre.' },
      { day: 2, activity: 'Visita a Chichén Itzá y cenote Ik Kil.' },
      { day: 3, activity: 'Exploración de Tulum y Playa Paraíso.' },
      { day: 4, activity: 'Aventura en Cobá y nado en cenotes.' },
      { day: 5, activity: 'Día libre en Playa del Carmen.' },
      { day: 6, activity: 'Actividades acuáticas en Xcaret o Xel-Há (opcional).' },
      { day: 7, activity: 'Desayuno y traslado al aeropuerto.' },
    ],
  },
  {
    id: 'sierra-madre-hiking',
    imageUrl: 'https://images.unsplash.com/photo-1506197603052-3cc9c3a201bd?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    title: 'Senderismo en la Sierra Madre',
    description: 'Descubre paisajes montañosos impresionantes y cascadas ocultas. Este tour te lleva a través de senderos desafiantes y vistas panorámicas, ideal para amantes de la naturaleza y la aventura. Incluye equipo de seguridad, guías expertos y campamentos en zonas designadas.',
    price: '$850 USD',
    duration: '5 días / 4 noches',
    includes: ['Transporte terrestre', 'Equipo de senderismo básico', 'Guía de montaña certificado', 'Comidas campestres', 'Permisos de acceso a parques naturales'],
    itinerary: [
      { day: 1, activity: 'Llegada al punto de encuentro, traslado a la base de la Sierra Madre y preparación para el campamento.' },
      { day: 2, activity: 'Senderismo a la Cascada Escondida y exploración de flora y fauna.' },
      { day: 3, activity: 'Ascenso al Pico del Águila con vistas panorámicas.' },
      { day: 4, activity: 'Visita a un pueblo mágico cercano y tarde de relajación.' },
      { day: 5, activity: 'Desayuno y regreso al punto de encuentro.' },
    ],
  },
  {
    id: 'oaxaca-culture-flavor',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961dde?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    title: 'Cultura y Sabor en Oaxaca',
    description: 'Sumérgete en la rica gastronomía y tradiciones de Oaxaca. Un viaje cultural que te llevará por mercados vibrantes, talleres de artesanía y degustaciones de mezcal. Conoce la historia de Monte Albán y disfruta de la calidez de su gente.',
    price: '$950 USD',
    duration: '6 días / 5 noches',
    includes: ['Transporte terrestre', 'Alojamiento en hoteles boutique', 'Desayunos y algunas comidas', 'Guía cultural', 'Visitas a mercados y talleres artesanales'],
    itinerary: [
      { day: 1, activity: 'Llegada a Oaxaca, traslado al hotel y cena de bienvenida.' },
      { day: 2, activity: 'Tour por el centro histórico, Santo Domingo y mercados.' },
      { day: 3, activity: 'Excursión a Monte Albán, Arbol del Tule y Teotitlán del Valle.' },
      { day: 4, activity: 'Clase de cocina oaxaqueña y degustación de mezcal.' },
      { day: 5, activity: 'Día libre para explorar o compras.' },
      { day: 6, activity: 'Desayuno y traslado al aeropuerto.' },
    ],
  },
  {
    id: 'chiapas-eco-adventure',
    imageUrl: 'https://images.unsplash.com/photo-1518098268026-c8923f15825f?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    title: 'Eco-Aventura en Chiapas',
    description: 'Descubre la exuberante selva de Chiapas, sus cascadas turquesas y la cultura indígena. Este tour te lleva a Palenque, Agua Azul y Misol-Ha, con experiencias de convivencia comunitaria.',
    price: '$1,100 USD',
    duration: '6 días / 5 noches',
    includes: ['Transporte terrestre', 'Alojamiento en cabañas ecológicas', 'Desayunos y cenas', 'Guía local', 'Entradas a parques naturales y sitios arqueológicos'],
    itinerary: [
      { day: 1, activity: 'Llegada a Tuxtla Gutiérrez, traslado a San Cristóbal de las Casas.' },
      { day: 2, activity: 'Visita a Cañón del Sumidero y Chiapa de Corzo.' },
      { day: 3, activity: 'Exploración de San Juan Chamula y Zinacantán.' },
      { day: 4, activity: 'Excursión a Palenque, cascadas de Agua Azul y Misol-Ha.' },
      { day: 5, activity: 'Día libre en San Cristóbal o visita a comunidades indígenas.' },
      { day: 6, activity: 'Desayuno y traslado al aeropuerto.' },
    ],
  },
  {
    id: 'mexico-city-magic',
    imageUrl: 'https://images.unsplash.com/photo-1512539296043-c7207503296a?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    title: 'Magia y Metrópolis: Ciudad de México',
    description: 'Sumérgete en la historia, arte y vida moderna de la capital mexicana. Visita museos, sitios arqueológicos y disfruta de su vibrante escena culinaria.',
    price: '$750 USD',
    duration: '4 días / 3 noches',
    includes: ['Alojamiento en hotel céntrico', 'Desayunos', 'Guía turístico', 'Transporte local', 'Entradas a museos principales'],
    itinerary: [
      { day: 1, activity: 'Llegada a CDMX, check-in y paseo por el Centro Histórico.' },
      { day: 2, activity: 'Visita a Teotihuacán y Basílica de Guadalupe.' },
      { day: 3, activity: 'Exploración de Coyoacán, Museo Frida Kahlo y Xochimilco.' },
      { day: 4, activity: 'Desayuno y traslado al aeropuerto.' },
    ],
  },
  {
    id: 'copper-canyon-express',
    imageUrl: 'https://images.unsplash.com/photo-1593693397690-ed401d8477a9?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D',
    title: 'El Chepe: Barrancas del Cobre',
    description: 'Un viaje en tren inolvidable a través de las majestuosas Barrancas del Cobre, explorando la cultura rarámuri y paisajes impresionantes.',
    price: '$1,500 USD',
    duration: '8 días / 7 noches',
    includes: ['Boletos de tren El Chepe (Clase Ejecutiva)', 'Alojamiento en hoteles de montaña', 'Desayunos y algunas comidas', 'Guía local', 'Actividades de aventura (teleférico, tirolesa)'],
    itinerary: [
      { day: 1, activity: 'Llegada a Chihuahua, city tour.' },
      { day: 2, activity: 'Tren El Chepe a Creel, visita a comunidades rarámuris.' },
      { day: 3, activity: 'Exploración de Divisadero y Parque de Aventuras Barrancas del Cobre.' },
      { day: 4, activity: 'Tren a Bahuichivo, visita a Cerocahui y Misión Jesuita.' },
      { day: 5, activity: 'Tren a El Fuerte, paseo en lancha por el río.' },
      { day: 6, activity: 'Día libre en El Fuerte o actividades opcionales.' },
      { day: 7, activity: 'Regreso en tren o traslado a Los Mochis.' },
      { day: 8, activity: 'Desayuno y traslado al aeropuerto.' },
    ],
  },
];