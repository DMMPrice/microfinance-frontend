// src/Component/NavLink.jsx
import React from "react";
import {NavLink as RRNavLink} from "react-router-dom";
import {cn} from "@/lib/utils.js";

export function NavLink({
                            to,
                            end = false,
                            className = "",
                            activeClassName = "",
                            children,
                            ...rest
                        }) {
    return (
        <RRNavLink
            to={to}
            end={end}
            className={({isActive}) =>
                cn(
                    className,
                    isActive && activeClassName
                )
            }
            {...rest}
        >
            {children}
        </RRNavLink>
    );
}
