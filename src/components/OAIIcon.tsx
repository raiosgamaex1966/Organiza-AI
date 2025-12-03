interface OAIIconProps {
    className?: string;
}

export const OAIIcon = ({ className = "w-8 h-8" }: OAIIconProps) => {
    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            {/* Agenda/Calendar Icon */}
            <rect
                x="3"
                y="4"
                width="18"
                height="18"
                rx="2"
                stroke="white"
                strokeWidth="2"
                fill="none"
            />
            <line
                x1="3"
                y1="9"
                x2="21"
                y2="9"
                stroke="white"
                strokeWidth="2"
            />
            <line
                x1="8"
                y1="2"
                x2="8"
                y2="6"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
            />
            <line
                x1="16"
                y1="2"
                x2="16"
                y2="6"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
            />
            {/* Dots representing days */}
            <circle cx="8" cy="13" r="1" fill="white" />
            <circle cx="12" cy="13" r="1" fill="white" />
            <circle cx="16" cy="13" r="1" fill="white" />
            <circle cx="8" cy="17" r="1" fill="white" />
            <circle cx="12" cy="17" r="1" fill="white" />
            <circle cx="16" cy="17" r="1" fill="white" />
        </svg>
    );
};
