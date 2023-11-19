/** @type {import("tailwindcss").Config} */
module.exports = {
    theme: {
        fontFamily: {
            sans: ["Roboto", "sans-serif"],
        }
    },
    daisyui: {
        themes: [
            {
                light: {
                    "text": "#130e01",
                    "primary": "#004D46",
                    "secondary": "#9CBD28",
                    "accent": "#9CBD28",
                    "neutral": "#2a323c",
                    "base-100": "#F4FFF9",
                    "info": "#06b6d4",
                    "success": "#9CBD28",
                    "warning": "#ffbe00",
                    "error": "#ff5055",
                },
                dark: {
                    "text": "#ECFEF5",
                    "primary": "#004D46",
                    "secondary": "#9CBD28",
                    "accent": "#9CBD28",
                    "neutral": "#2a323c",
                    "base-100": "#1d232a",
                    "info": "#06b6d4",
                    "success": "#9CBD28",
                    "warning": "#ffbe00",
                    "error": "#ff5055",
                }
            }
        ]
    },
    plugins: [require("@tailwindcss/typography"),
    require("daisyui")],
};