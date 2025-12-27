// src/Utils/NavLink.jsx
import React from "react";
import {NavLink as RouterNavLink} from "react-router-dom";
import {cn} from "@/lib/utils";

export const NavLink = React.forwardRef(
    ({to, className, activeClassName, end, ...props}, ref) => {
        return (
            <RouterNavLink
                ref={ref}                 // 🔥 IMPORTANT
                to={to}
                end={end}
                className={({isActive}) =>
                    cn(
                        className,
                        isActive && activeClassName
                    )
                }
                {...props}
            />
        );
    }
);

NavLink.displayName = "NavLink";
