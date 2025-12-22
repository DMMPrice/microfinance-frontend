import {useEffect} from "react";
import {useNavigate} from "react-router-dom";

const Index = () => {
    const navigate = useNavigate();

    useEffect(() => {
        navigate("/login", {replace: true});
    }, [navigate]);

    return null; // no UI needed
};

export default Index;
