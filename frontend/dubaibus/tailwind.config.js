/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./src/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      // RTA Dubai Theme Colors
      colors: {
        // Primary Colors
        rta: {
          orange: "#F7941D",
          "orange-light": "#FFAD4D",
          "orange-dark": "#D97B0D",
          blue: "#003366",
          "blue-light": "#004C99",
          "blue-dark": "#002244",
        },
        // Metro Line Colors
        metro: {
          red: "#E21836",
          "red-light": "#FF4D6A",
          green: "#4CAF50",
          "green-light": "#81C784",
          blue: "#006AA7", // Route 2020
          "blue-light": "#339DD1",
        },
        // Background Colors
        background: {
          primary: "#F5F5F5",
          secondary: "#FFFFFF",
          card: "#FFFFFF",
          dark: "#1A2332",
        },
        // Text Colors
        text: {
          primary: "#1A2332",
          secondary: "#666666",
          muted: "#999999",
          light: "#FFFFFF",
        },
      },
      // Custom Font Family
      fontFamily: {
        poppins: ["Poppins", "sans-serif"],
        "poppins-bold": ["Poppins-Bold", "sans-serif"],
        "poppins-medium": ["Poppins-Medium", "sans-serif"],
        "poppins-semibold": ["Poppins-SemiBold", "sans-serif"],
      },
      // Box Shadows for Neumorphic Effect
      boxShadow: {
        neumorphic: "8px 8px 16px #d1d1d1, -8px -8px 16px #ffffff",
        "neumorphic-sm": "4px 4px 8px #d1d1d1, -4px -4px 8px #ffffff",
        "neumorphic-inset": "inset 4px 4px 8px #d1d1d1, inset -4px -4px 8px #ffffff",
        card: "0px 4px 12px rgba(0, 0, 0, 0.08)",
        "card-hover": "0px 8px 24px rgba(0, 0, 0, 0.12)",
      },
      // Border Radius
      borderRadius: {
        card: "16px",
        button: "12px",
        input: "10px",
      },
      // Spacing
      spacing: {
        "safe-top": "44px",
        "safe-bottom": "34px",
      },
    },
  },
  plugins: [],
};
