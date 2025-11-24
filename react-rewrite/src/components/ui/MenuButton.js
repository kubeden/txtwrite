'use client';

import { useState, useRef } from 'react';
import MacStyleMenu from './MacStyleMenu';

/**
 * A button that triggers a Mac-style dropdown menu
 * @param {Object} props
 * @param {string} props.label - Text to display on the button
 * @param {Object[]} props.menuItems - Array of menu items to pass to MacStyleMenu
 * @param {string} props.position - Position of the menu relative to the button
 */
const MenuButton = ({ label, menuItems, position = 'top-left', className = '' }) => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const buttonRef = useRef(null);

    const toggleMenu = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    const closeMenu = () => {
        setIsMenuOpen(false);
    };

    return (
        <div className="relative inline-block">
            <button
                ref={buttonRef}
                className={`${className}`}
                onClick={toggleMenu}
                aria-haspopup="true"
                aria-expanded={isMenuOpen}
            >
                {label}
            </button>

            <MacStyleMenu
                items={menuItems}
                isOpen={isMenuOpen}
                onClose={closeMenu}
                position={position}
            />
        </div>
    );
};

export default MenuButton;