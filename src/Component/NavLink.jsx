// src/Component/NavLink.jsx
import {NavLink as RRNavLink} from "react-router-dom";

export function NavLink({
                            activeClassName = "",
                            className = "",
                            ...props
                        }) {
    return (
        <RRNavLink
            {...props}
            className={({isActive}) => {
                const base =
                    typeof className === "function" ? className({isActive}) : className;

                return [base, isActive ? activeClassName : ""].filter(Boolean).join(" ");
            }}
        />
    );
}
