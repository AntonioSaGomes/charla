// Static content: varieties, scenarios, correction types, and the pronunciation guide.

export const VARIANTS = {
  es: {
    label: 'España', code: 'es-ES', prefs: ['es-ES'], a: 'Lucía', b: 'Javier', from: 'from Madrid', city: 'Madrid', tu: 'tú',
    waiter: 'camarero', flat: 'piso', car: 'coche', bar: 'a busy tapas bar in La Latina, Madrid',
    desc: 'Spain (Madrid): tú and vosotros; distinción (z/ce/ci as [θ]); pretérito perfecto for today and this week ("hoy he comido"); words like coche, móvil, ordenador, vale, guay, tío.'
  },
  mx: {
    label: 'México', code: 'es-MX', prefs: ['es-MX', 'es-US', 'es-419'], a: 'Valeria', b: 'Diego', from: 'from Mexico City', city: 'Ciudad de México', tu: 'tú',
    waiter: 'mesero', flat: 'departamento', car: 'carro', bar: 'a busy taquería in Colonia Roma, Mexico City',
    desc: 'Mexico (Mexico City): tú and ustedes, never vosotros; seseo; pretérito indefinido for the recent past ("hoy comí"); words like carro, celular, computadora, ¿mande?, padre/chido, ahorita.'
  },
  ar: {
    label: 'Argentina', code: 'es-AR', prefs: ['es-AR', 'es-419', 'es-US', 'es-MX'], a: 'Sofía', b: 'Martín', from: 'from Buenos Aires', city: 'Buenos Aires', tu: 'vos',
    waiter: 'mozo', flat: 'departamento', car: 'auto', bar: 'a parrilla in Palermo, Buenos Aires',
    desc: 'Argentina (Rioplatense, Buenos Aires): voseo (vos tenés, vos sos, vení, decime), ustedes, never vosotros; sheísmo (ll/y as [ʃ]); pretérito indefinido for the recent past; words like auto, celular, computadora, che, re (re lindo), dale, laburo.'
  }
};

export const SCENE_ICONS = {
  libre: '<path d="M5 9h11v5a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5z"/><path d="M16 10h1.5a2.5 2.5 0 0 1 0 5H16"/><path d="M8.5 3.5c0 1 1 1.5 1 2.5M12 3.5c0 1 1 1.5 1 2.5"/>',
  bar: '<path d="M7 3.5h10l-1 5.5a4 4 0 0 1-8 0z"/><path d="M12 13v7M8.5 20.5h7"/>',
  calle: '<path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.4"/>',
  piso: '<circle cx="8" cy="15" r="4"/><path d="M11 12l8-8M16 7l2.5 2.5M13.5 9.5l2 2"/>',
  farmacia: '<rect x="4" y="4" width="16" height="16" rx="5"/><path d="M12 8.5v7M8.5 12h7"/>',
  entrevista: '<rect x="3.5" y="7.5" width="17" height="12" rx="2.5"/><path d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5M3.5 13h17"/>',
  fiesta: '<path d="M4 20l4.5-11 6.5 6.5z"/><path d="M14 4.5c.5 1.5 0 3-1.5 4M19.5 10c-1.5-.5-3 0-4 1.5M17 3v1.5M21 7h-1.5M18 14l1 1"/>',
  debate: '<path d="M4 5h10v7H8l-4 3z"/><path d="M14 9h6v7l-3-2.5h-6V12"/>',
  reclamacion: '<path d="M6.5 3.5h3l1.5 4-2 1.5a11 11 0 0 0 6 6l1.5-2 4 1.5v3a2 2 0 0 1-2 2A16 16 0 0 1 4.5 5.5a2 2 0 0 1 2-2z"/>',
  finde: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4"/>',
  custom: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z"/><path d="M18.5 15.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z"/>',
  repaso: '<path d="M4.5 12a7.5 7.5 0 0 1 13.2-4.9L20 9.5M20 4.5v5h-5M19.5 12a7.5 7.5 0 0 1-13.2 4.9L4 14.5M4 19.5v-5h5"/>'
};

export const SCENE_COLORS = {
  libre: ['#FFA24C', '#FF5A5F'], bar: ['#F9B934', '#F2552C'], calle: ['#25C2C4', '#2F86FF'], piso: ['#8B86F0', '#5A50D6'],
  farmacia: ['#3BD49C', '#0FA3A1'], entrevista: ['#7C8BA1', '#3B4A63'], fiesta: ['#F87AC0', '#A65BF2'], debate: ['#FF7A6B', '#D0343F'],
  reclamacion: ['#45C3F9', '#2F63EA'], finde: ['#FFD54A', '#F79A17'], custom: ['#FF6A70', '#D6408E'], repaso: ['#2ED3A0', '#0E9F6E']
};

export const SCENARIOS = [
  { id: 'libre', title: 'Charla libre', en: 'Coffee with a new friend. Talk about anything.', focus: 'Fluidez', who: 'a', role: () => 'amiga',
    scene: v => `You are ${v.a}, a warm, curious woman in her 30s ${v.from}. You're having coffee with the learner, a Portuguese friend of a friend you've just met. Chat naturally about everyday life, work, hobbies, travel, food and plans. Share your own opinions and small anecdotes instead of only asking questions. Informal register (${v.tu}).` },
  { id: 'bar', title: 'En el bar', en: "Order food and drinks, ask what's good, get the bill.", focus: 'Pedir', who: 'b', role: v => v.waiter,
    scene: v => `You are ${v.b}, a ${v.waiter} at ${v.bar}. The learner has just sat down. Greet them, take their order, recommend local dishes, answer questions about ingredients, and later bring the bill. Add realistic hiccups: something has run out, a question about drinks or sharing. Friendly, quick, natural service register.` },
  { id: 'calle', title: 'Perdido en la ciudad', en: 'Ask a local for directions and transport.', focus: 'Direcciones', who: 'a', role: () => 'vecina',
    scene: v => `You are ${v.a}, a local in ${v.city} whom the learner stops on the street. They are lost and need to get somewhere (let them say where; if they don't, ask). Give realistic directions with real-sounding streets, landmarks and public transport, with a few turns and options. React naturally if they don't understand.` },
  { id: 'piso', title: v => v.label === 'España' ? 'Alquilar un piso' : v.label === 'México' ? 'Rentar un departamento' : 'Alquilar un departamento', en: 'Call a landlord: price, deposit, a viewing.', focus: 'Preguntas', who: 'b', role: () => 'propietario',
    scene: v => `You are ${v.b}, who is renting out a ${v.flat} in ${v.city}. The learner phones about your ad. Answer the phone the way people do in your variety, then talk about price, deposit, bills, furniture, the neighbourhood and move-in date, and arrange a viewing. Be realistic: a few conditions and a small catch. Polite and fairly casual; use usted unless the learner suggests tú/vos.` },
  { id: 'farmacia', title: 'En la farmacia', en: 'Explain your symptoms and get advice.', focus: 'Salud', who: 'a', role: () => 'farmacéutica',
    scene: v => `You are ${v.a}, a pharmacist in ${v.city}. The learner comes in feeling unwell. Ask follow-up questions about symptoms, how long, allergies and other medication; recommend something and explain how to take it; say when to see a doctor. Professional and kind, usted.` },
  { id: 'entrevista', title: 'Entrevista de trabajo', en: 'A formal interview for a job you want.', focus: 'Formal', who: 'a', role: () => 'entrevistadora',
    scene: v => `You are ${v.a}, an HR manager at a mid-size company in ${v.city}, interviewing the learner. In your first line, welcome them and ask which position they're applying for. Ask about experience, strengths, weaknesses, a situational question and salary expectations, with follow-ups to their answers. Formal register: usted throughout.` },
  { id: 'fiesta', title: 'Conocer gente', en: "Small talk at a friend's birthday party.", focus: 'Coloquial', who: 'b', role: () => 'invitado',
    scene: v => `You are ${v.b}, a sociable guy at a mutual friend's birthday party in ${v.city}. Start small talk with the learner, find common ground, joke a bit, use natural colloquial expressions of your variety, and maybe suggest plans for another day. Informal (${v.tu}).` },
  { id: 'debate', title: 'Debate', en: "Defend your opinion. He'll take the other side.", focus: 'Opinar', who: 'b', role: () => 'amigo polémico',
    scene: v => `You are ${v.b}, an opinionated but good-natured friend ${v.from}. In your first line, propose a light debate topic (city vs countryside, mass tourism, remote work, social media, tipping...) and ask the learner's view. Always take the opposite side, give arguments, and push them to justify and nuance, modelling connectors like "sin embargo", "aun así", "en cambio", "por un lado... por otro". Informal (${v.tu}).` },
  { id: 'reclamacion', title: 'Reclamación', en: 'Complain politely on the phone and get it fixed.', focus: 'Cortesía', who: 'a', role: () => 'atención al cliente',
    scene: v => `You are ${v.a}, a customer-service agent on the phone for an airline in ${v.city}. The learner's suitcase didn't arrive. Follow procedure: ask for the booking reference, a description of the bag and a delivery address; offer options; resist a little before offering compensation. Polite, formal register (usted).` },
  { id: 'finde', title: '¿Qué tal el finde?', en: 'Monday morning: tell a coworker about your weekend.', focus: 'Pasado', who: 'b', role: () => 'compañero',
    scene: v => `You are ${v.b}, the learner's friendly coworker in ${v.city}. It's Monday morning at the coffee machine. Ask about their weekend and keep asking follow-ups that make them narrate in the past (what happened, what it was like, what they used to do as kids there). Share your own weekend story too. Informal (${v.tu}).` }
];

export const TYPES = {
  false_friend: ['Falso amigo', 'interf'], portuguese: ['Portuguesismo', 'interf'],
  grammar: ['Gramática', 'gram'], verb: ['Verbo', 'gram'], gender: ['Género', 'gram'], preposition: ['Preposición', 'gram'], word_order: ['Orden', 'gram'],
  vocabulary: ['Vocabulario', 'lex'], register: ['Registro', 'lex'],
  spelling: ['Ortografía', 'form'], accent: ['Tilde', 'form'], pronunciation: ['Pronunciación', 'form']
};

export const GROUPS = [['interf', 'Del portugués'], ['gram', 'Gramática'], ['lex', 'Vocabulario'], ['form', 'Forma y sonido']];

export const PRON = [
  { k: 'Vocales', t: 'Full, clear vowels', d: 'Spanish never swallows a vowel. Where Lisbon Portuguese shrinks unstressed syllables, say every vowel in full and at the same length.', ex: ['teléfono', 'pequeño', 'momento', 'desesperado'] },
  { k: 'Sin nasales', t: 'No nasal vowels', d: 'There is no ão, õe or nasal em. The vowel stays oral and the n is just a consonant.', ex: ['canción', 'también', 'pan', 'son'] },
  { k: 'J · G', t: 'The jota', d: 'A rasp from the back of the throat, like Scottish "loch". Never the soft Portuguese j of "janela".', ex: ['jamón', 'gente', 'ojo', 'México'] },
  { k: 'R · RR', t: 'Tongue-tip trill', d: 'At the start of a word, after n/l/s, and for rr: trill with the tip of the tongue. Never the throaty Portuguese R of "rato".', ex: ['rato', 'perro', 'Roma', 'Enrique'] },
  { k: 'B = V', t: 'One sound for b and v', d: 'There is no lip-and-teeth v. "Vino" starts like "bino". Between vowels both soften, lips barely touching.', ex: ['vino', 'vaca', 'uva', 'Valencia'] },
  { k: 'S', t: 'S is always s', d: 'Never the "sh" Lisbon speakers put before consonants and at the end of words: "mismo" is not "mijmo".', ex: ['más', 'después', 'mismo', 'España'] },
  { k: 'Z · C', t: 'Spain: "th". Americas: s', d: 'In Spain, z and c before e/i sound like English "think". In Mexico and Argentina they sound like s.', ex: ['cerveza', 'zapato', 'gracias', 'cine'], key: 'z' },
  { k: 'LL · Y', t: 'Not the Portuguese lh', d: 'Most speakers say ll and y like a firm English "y". In Argentina both sound like "sh": calle ≈ "cashe".', ex: ['llamar', 'calle', 'yo', 'pollo'], key: 'll' },
  { k: 'CH', t: 'Always "tch"', d: 'Spanish ch is "tch" as in "chico", never the "sh" of Portuguese "chave".', ex: ['chico', 'mucho', 'noche', 'chocolate'] },
  { k: 'D', t: 'Soft d between vowels', d: 'Between vowels and at the end of a word, d softens to the "th" of English "this".', ex: ['nada', 'cansado', 'Madrid', 'ciudad'] },
  { k: 'E · O', t: 'No open or closed vowels', d: 'Spanish e and o have one quality each. No é/ê or ó/ô contrast: keep them mid and even.', ex: ['bebé', 'todo', 'perro', 'ojo'] },
  { k: 'H · Ñ', t: 'Silent h, ñ is your nh', d: 'H is silent, as in Portuguese. Ñ is exactly your nh: España = Espanha.', ex: ['hola', 'ahora', 'niño', 'mañana'] }
];

export const FALSE = [
  ['embarazada', 'pregnant', 'embaraçada (embarrassed)', 'avergonzada'],
  ['exquisito', 'delicious', 'esquisito (weird)', 'raro'],
  ['oficina', 'office', 'oficina (workshop)', 'taller'],
  ['escritorio', 'desk', 'escritório (office)', 'oficina'],
  ['taller', 'workshop, garage', 'talher (cutlery)', 'cubiertos'],
  ['polvo', 'dust', 'polvo (octopus)', 'pulpo'],
  ['rato', 'a while', 'rato (mouse)', 'ratón'],
  ['cena', 'dinner', 'cena (scene)', 'escena'],
  ['largo', 'long', 'largo (wide)', 'ancho'],
  ['rojo', 'red', 'roxo (purple)', 'morado'],
  ['rubio', 'blond', 'ruivo (redhead)', 'pelirrojo'],
  ['salada', 'salty', 'salada (salad)', 'ensalada'],
  ['vaso', 'drinking glass', 'vaso (flowerpot)', 'maceta'],
  ['copo', 'flake (of snow)', 'copo (glass)', 'vaso'],
  ['cadera', 'hip', 'cadeira (chair)', 'silla'],
  ['acordarse', 'to remember', 'acordar (to wake up)', 'despertarse'],
  ['todavía', 'still, yet', 'todavia (however)', 'sin embargo'],
  ['propina', 'tip, gratuity', 'propinas (tuition fees)', 'tasas'],
  ['firma', 'signature', 'firma (company)', 'empresa'],
  ['presunto', 'alleged', 'presunto (cured ham)', 'jamón'],
  ['zurdo', 'left-handed', 'surdo (deaf)', 'sordo'],
  ['fechar', 'to date (a letter)', 'fechar (to close)', 'cerrar'],
  ['tirar', 'to throw away, to pull', 'tirar (to take off)', 'quitar'],
  ['brincar', 'to jump', 'brincar (to play)', 'jugar'],
  ['contestar', 'to answer', 'contestar (to dispute)', 'impugnar'],
  ['latir', 'to beat (a heart)', 'latir (to bark)', 'ladrar'],
  ['aceite', 'oil', 'aceite (accepted)', 'aceptado'],
  ['cola', 'queue; tail', 'cola (glue)', 'pegamento']
];

export const GRAM = [
  ['Vou comer.', 'Voy a comer.', 'Ir + a + infinitive. Dropping the "a" is the classic Portuguese slip.'],
  ['Estou a trabalhar.', 'Estoy trabajando.', 'Portugal\'s "estar a + infinitive" becomes estar + gerund.'],
  ['Gosto de cães.', 'Me gustan los perros.', 'Gustar works like "agradar": the thing you like is the subject, and there is no "de".'],
  ['Vejo a minha mãe.', 'Veo a mi madre.', 'Your "a" is an article; the Spanish "a" marks a person as the object. No article before possessives.'],
  ['Muito bom, muito tempo.', 'Muy bueno, mucho tiempo.', '"Muy" before adjectives and adverbs, "mucho" with nouns and verbs.'],
  ['Hoje comi peixe.', 'Hoy he comido pescado.', 'In Spain, today and this week take the pretérito perfecto. In Mexico and Argentina "hoy comí" is normal.'],
  ['Quando puder, ligo-te.', 'Cuando pueda, te llamo.', 'No future subjunctive: use the present subjunctive. Pronouns go before a conjugated verb.'],
  ['É melhor irmos.', 'Es mejor que vayamos.', 'No personal infinitive: use que + subjunctive.'],
  ['Tenho estado doente.', 'He estado enfermo.', 'Compound tenses use haber, never tener.'],
  ['O que disse?', '¿Qué dijo? / lo que dijo', 'Questions use "qué". "O que" in the middle of a sentence is "lo que".'],
  ['a viagem, a mensagem', 'el viaje, el mensaje', 'Every -agem word is masculine -aje in Spanish.'],
  ['o leite, o sangue, a cor', 'la leche, la sangre, el color', 'Gender swaps to learn by heart.'],
  ['no carro, na casa, pelo parque', 'en el coche, en la casa, por el parque', 'Only "al" and "del" contract.']
];

export const MODELS = [
  { id: 'claude-haiku-5-5', label: 'Haiku 5.5', note: 'Fastest and cheapest: about 5 cents per hour of practice.' },
  { id: 'claude-sonnet-5-5', label: 'Sonnet 5.5', note: 'Sharper corrections. About 1 cent per message.' },
  { id: 'claude-opus-5-5', label: 'Opus 5.5', note: 'Best corrections. About 2–3 cents per message, a little slower.' }
];

export const STT_MODELS = [
  { id: 'onnx-community/whisper-tiny', label: 'Ligero', note: 'About 40 MB. Recommended on iPhone: uses the least memory.' },
  { id: 'onnx-community/whisper-base', label: 'Estándar', note: 'About 80 MB. More accurate, but needs about 1.5 GB of memory: may crash on iPhone.' },
  { id: 'onnx-community/whisper-small', label: 'Preciso', note: 'About 250 MB. Most accurate. For computers and iPads.' }
];
