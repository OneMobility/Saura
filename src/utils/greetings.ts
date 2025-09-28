export const getGreeting = (name: string | null) => {
  const hour = new Date().getHours();
  let greeting = '';

  if (hour >= 5 && hour < 12) {
    greeting = 'Buenos días';
  } else if (hour >= 12 && hour < 19) {
    greeting = 'Buenas tardes';
  } else {
    greeting = 'Buenas noches';
  }

  return `${greeting}, ${name || 'Administrador'}`;
};