import * as THREE from "three";

const GradientPlanes = () => {
    // Функция для создания шейдерного материала с градиентом
    const createGradientMaterial = (color1: string, color2: string) => {
        return new THREE.ShaderMaterial({
            uniforms: {
                color1: {value: new THREE.Color(color1)}, // Первый цвет
                color2: {value: new THREE.Color(color2)}, // Второй цвет
            },
            vertexShader: `
                varying vec2 vUv;
                void main() {
                    vUv = uv;
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                }
            `,
            fragmentShader: `
                uniform vec3 color1;
                uniform vec3 color2;
                varying vec2 vUv;
                void main() {
                    gl_FragColor = vec4(mix(color1, color2, vUv.y), 0.3); // Установите прозрачность, например, 0.5

                }
            `,
            side: THREE.DoubleSide, // Градиент виден с обеих сторон
            transparent: true, // Прозрачность
            opacity: 0.9, // Лёгкая прозрачность
        });
    };

    return (
        <>
            {/* Плоскость для оси X-Z */}
            <mesh position={[2.5, 0, 2.5]} rotation={[Math.PI / 2, 0, 0]}>
                <planeGeometry args={[5, 5]}/>
                <primitive
                    attach="material"
                    object={createGradientMaterial("#40E0D0", "#8A2BE2")} // Бирюзовый -> Фиолетовый
                />
            </mesh>

            {/* Плоскость для оси X-Y */}
            <mesh position={[2.5, 2.5, 0]} rotation={[0, 0, Math.PI / 2]}>
                <planeGeometry args={[5, 5]}/>
                <primitive
                    attach="material"
                    object={createGradientMaterial("#00BFFF", "#40E0D0")} // Голубой -> Бирюзовый
                />
            </mesh>

            {/* Плоскость для оси Y-Z */}
            <mesh position={[0, 2.5, 2.5]} rotation={[0, Math.PI / 2, 0]}>
                <planeGeometry args={[5, 5]}/>
                <primitive
                    attach="material"
                    object={createGradientMaterial("#8A2BE2", "#00FF7F")} // Фиолетовый -> Мятный
                />
            </mesh>

        </>

    );
};


export default GradientPlanes;