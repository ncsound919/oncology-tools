import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, ContactShadows, Float, Environment } from '@react-three/drei';
import * as THREE from 'three';
import { AgentPersona } from '../types';

interface AbstractDebaterProps {
  agent: AgentPersona;
  position: [number, number, number];
  rotation: [number, number, number];
  isSpeaking: boolean;
  color: string;
}

function AbstractDebater({ agent, position, rotation, isSpeaking, color }: AbstractDebaterProps) {
  const groupRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Mesh>(null);
  const ringRef1 = useRef<THREE.Mesh>(null);
  const ringRef2 = useRef<THREE.Mesh>(null);
  const ringRef3 = useRef<THREE.Mesh>(null);
  const targetColor = useMemo(() => new THREE.Color(color), [color]);
  const idleColor = useMemo(() => new THREE.Color('#334155'), []);

  const [spawned, setSpawned] = useState(false);
  useEffect(() => {
    // Stagger spawn based on position to create a nice cascading entrance
    const timer = setTimeout(() => setSpawned(true), Math.random() * 500);
    return () => clearTimeout(timer);
  }, []);

  useFrame((state) => {
    // Spawn animation
    if (groupRef.current) {
      const scale = spawned ? 1 : 0.001;
      groupRef.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.08);
    }

    if (headRef.current) {
      // Bob up and down slightly when speaking
      if (isSpeaking) {
        headRef.current.position.y = 1.6 + Math.sin(state.clock.elapsedTime * 8) * 0.05;
        // Pulse scale
        const scale = 1 + Math.sin(state.clock.elapsedTime * 6) * 0.05;
        headRef.current.scale.set(scale, scale, scale);
      } else {
        headRef.current.position.y = THREE.MathUtils.lerp(headRef.current.position.y, 1.5, 0.1);
        headRef.current.scale.lerp(new THREE.Vector3(1, 1, 1), 0.1);
      }
      
      // Update color
      if (headRef.current.material instanceof THREE.MeshPhysicalMaterial) {
        headRef.current.material.color.lerp(isSpeaking ? targetColor : idleColor, 0.1);
        headRef.current.material.emissive.lerp(isSpeaking ? targetColor : new THREE.Color(0x000000), 0.1);
        headRef.current.material.emissiveIntensity = isSpeaking ? 0.6 : 0.05;
      }
    }

    // Rings animation
    const animateRing = (ref: React.RefObject<THREE.Mesh>, speedBase: number, scaleBase: number, axis: 'x' | 'y' | 'z', dir: 1 | -1) => {
      if (ref.current) {
        if (isSpeaking) {
          const pulse = 1 + Math.sin(state.clock.elapsedTime * speedBase) * 0.15;
          ref.current.scale.setScalar(scaleBase * pulse);
          ref.current.rotation[axis] += 0.03 * dir;
          ref.current.rotation.y += 0.02 * dir;
          (ref.current.material as THREE.MeshBasicMaterial).opacity = 0.5 + Math.sin(state.clock.elapsedTime * speedBase) * 0.3;
        } else {
          ref.current.scale.lerp(new THREE.Vector3(scaleBase, scaleBase, scaleBase), 0.1);
          (ref.current.material as THREE.MeshBasicMaterial).opacity = THREE.MathUtils.lerp((ref.current.material as THREE.MeshBasicMaterial).opacity, 0, 0.1);
        }
      }
    };

    animateRing(ringRef1, 4, 1.0, 'x', 1);
    animateRing(ringRef2, 5, 0.8, 'z', -1);
    animateRing(ringRef3, 6, 1.2, 'x', -1);
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation} scale={0.001}>
      <Float speed={isSpeaking ? 5 : 1} rotationIntensity={isSpeaking ? 1 : 0.2} floatIntensity={isSpeaking ? 1 : 0.2}>
        <group>
          {/* Abstract Body - Glassy/Holographic */}
          <mesh position={[0, 0.6, 0]}>
            <capsuleGeometry args={[0.3, 1.0, 4, 16]} />
            <meshPhysicalMaterial 
              color="#0f172a" 
              roughness={0.2} 
              metalness={0.9} 
              transmission={0.8}
              thickness={1}
              ior={1.5}
            />
          </mesh>
          
          {/* Abstract Head */}
          <mesh ref={headRef} position={[0, 1.5, 0]}>
            <sphereGeometry args={[0.25, 32, 32]} />
            <meshPhysicalMaterial 
              color="#334155" 
              roughness={0.1} 
              metalness={0.8} 
              transmission={0.5}
              thickness={0.5}
              clearcoat={1}
            />
          </mesh>

          {/* Speaking Ring Indicators */}
          <mesh ref={ringRef1} position={[0, 1.5, 0]}>
            <torusGeometry args={[0.4, 0.015, 16, 64]} />
            <meshBasicMaterial color={targetColor} transparent opacity={0} blending={THREE.AdditiveBlending} />
          </mesh>
          <mesh ref={ringRef2} position={[0, 1.5, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.4, 0.015, 16, 64]} />
            <meshBasicMaterial color={targetColor} transparent opacity={0} blending={THREE.AdditiveBlending} />
          </mesh>
          <mesh ref={ringRef3} position={[0, 1.5, 0]} rotation={[0, Math.PI / 4, 0]}>
            <torusGeometry args={[0.4, 0.015, 16, 64]} />
            <meshBasicMaterial color={targetColor} transparent opacity={0} blending={THREE.AdditiveBlending} />
          </mesh>
        </group>
      </Float>

      {/* Name Label */}
      <Text
        position={[0, -0.2, 0]}
        fontSize={0.25}
        color={isSpeaking ? color : "#94a3b8"}
        anchorX="center"
        anchorY="middle"
        font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2"
        outlineWidth={0.02}
        outlineColor="#000000"
      >
        {agent.name}
      </Text>
    </group>
  );
}

interface ParticleStreamProps {
  fromPosition: [number, number, number];
  toPosition: [number, number, number];
  color: string;
  isActive: boolean;
}

function ParticleStream({ fromPosition, toPosition, color, isActive }: ParticleStreamProps) {
  const curve = useMemo(() => {
    const from = new THREE.Vector3(...fromPosition);
    from.y += 1.5; // Head height
    const to = new THREE.Vector3(...toPosition);
    to.y += 1.5;
    
    // Middle point for arc
    const mid = new THREE.Vector3().lerpVectors(from, to, 0.5);
    mid.y += 1.2; // Arc height
    
    return new THREE.QuadraticBezierCurve3(from, mid, to);
  }, [fromPosition, toPosition]);

  const lineGeometry = useMemo(() => {
    return new THREE.BufferGeometry().setFromPoints(curve.getPoints(40));
  }, [curve]);

  const lineRef = useRef<THREE.Line>(null);
  const packet1Ref = useRef<THREE.Mesh>(null);
  const packet2Ref = useRef<THREE.Mesh>(null);
  const packet3Ref = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (lineRef.current) {
      if (isActive) {
        (lineRef.current.material as any).dashOffset = ((lineRef.current.material as any).dashOffset || 0) - 0.08;
        (lineRef.current.material as THREE.LineDashedMaterial).opacity = 0.9;
        
        // Animate packets
        const t1 = (state.clock.elapsedTime * 0.8) % 1;
        const t2 = (state.clock.elapsedTime * 0.8 + 0.33) % 1;
        const t3 = (state.clock.elapsedTime * 0.8 + 0.66) % 1;
        
        if (packet1Ref.current) packet1Ref.current.position.copy(curve.getPointAt(t1));
        if (packet2Ref.current) packet2Ref.current.position.copy(curve.getPointAt(t2));
        if (packet3Ref.current) packet3Ref.current.position.copy(curve.getPointAt(t3));
        
      } else {
        (lineRef.current.material as THREE.LineDashedMaterial).opacity = THREE.MathUtils.lerp((lineRef.current.material as THREE.LineDashedMaterial).opacity, 0, 0.1);
      }
    }
  });

  return (
    <group>
      {/* @ts-ignore */}
      <line ref={lineRef as any} geometry={lineGeometry}>
        <lineDashedMaterial 
          color={color} 
          dashSize={0.3} 
          gapSize={0.15} 
          transparent 
          opacity={0} 
          blending={THREE.AdditiveBlending}
          linewidth={2}
        />
      </line>
      
      {/* Moving Data Packets */}
      <mesh ref={packet1Ref} visible={isActive}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={packet2Ref} visible={isActive}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={packet3Ref} visible={isActive}>
        <sphereGeometry args={[0.06, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.8} blending={THREE.AdditiveBlending} />
      </mesh>
    </group>
  );
}

// Custom Camera Controller to focus on the active speaker smoothly
function CameraRig({ activeSpeakerId, visualAgents, controlsRef }: { activeSpeakerId: string | null, visualAgents: any[], controlsRef: any }) {
  useFrame(() => {
    if (controlsRef.current) {
      if (activeSpeakerId) {
        const speaker = visualAgents.find((a: any) => a.id === activeSpeakerId);
        if (speaker) {
          // Move target slightly towards speaker for dynamic framing
          const target = new THREE.Vector3(speaker.position[0] * 0.4, 0.5, speaker.position[2] * 0.4);
          controlsRef.current.target.lerp(target, 0.03);
        }
      } else {
        // Return to center
        controlsRef.current.target.lerp(new THREE.Vector3(0, 0, 0), 0.02);
      }
      controlsRef.current.update();
    }
  });
  return null;
}

interface Debater3DVisualizerProps {
  agents: AgentPersona[];
  activeSpeakingAgentId: string | null;
}

const DEFAULT_COLORS = ['#38bdf8', '#f472b6', '#a78bfa', '#34d399', '#fbbf24'];

export default function Debater3DVisualizer({ agents, activeSpeakingAgentId }: Debater3DVisualizerProps) {
  const controlsRef = useRef(null);

  const visualAgents = useMemo(() => {
    const count = agents.length;
    if (count === 0) return [];
    
    // Make the radius larger if it's a fixed background
    const radius = count <= 2 ? 3 : 4;
    
    return agents.slice(0, 4).map((agent, index) => {
      let angle = (index / count) * Math.PI * 2;
      if (count === 2) {
        // Place them facing each other
        angle = index === 0 ? -Math.PI / 4 : (3 * Math.PI) / 4;
      }
      
      const x = Math.sin(angle) * radius;
      const z = Math.cos(angle) * radius;
      
      const rotationY = angle + Math.PI;

      return {
        agent,
        position: [x, 0, z] as [number, number, number],
        rotation: [0, rotationY, 0] as [number, number, number],
        color: DEFAULT_COLORS[index % DEFAULT_COLORS.length],
        id: agent.id
      };
    });
  }, [agents]);

  if (visualAgents.length === 0) return null;

  return (
    <div className="fixed inset-0 z-0 pointer-events-none opacity-40 mix-blend-screen transition-opacity duration-1000">
      <Canvas camera={{ position: [0, 4, 8], fov: 50 }} dpr={[1, 2]}>
        {/* Transparent background so it overlays the site */}
        <Environment preset="city" />
        
        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <spotLight position={[0, 8, 0]} intensity={1.5} penumbra={1} color="#e2e8f0" angle={0.6} />
        <pointLight position={[-4, 3, 3]} intensity={1.5} color="#38bdf8" distance={10} />
        <pointLight position={[4, 3, -3]} intensity={1.5} color="#f472b6" distance={10} />

        {/* Camera Logic */}
        <CameraRig activeSpeakerId={activeSpeakingAgentId} visualAgents={visualAgents} controlsRef={controlsRef} />

        {/* Render Agents */}
        {visualAgents.map((va) => (
          <AbstractDebater
            key={va.id}
            agent={va.agent}
            position={va.position}
            rotation={va.rotation}
            color={va.color}
            isSpeaking={activeSpeakingAgentId === va.id}
          />
        ))}

        {/* Data exchange streams */}
        {visualAgents.map((va) => {
          if (activeSpeakingAgentId === va.id) {
            return visualAgents.map((other) => {
              if (other.id !== va.id) {
                return (
                  <ParticleStream 
                    key={`${va.id}-${other.id}`}
                    fromPosition={va.position}
                    toPosition={other.position}
                    color={va.color}
                    isActive={true}
                  />
                );
              }
              return null;
            });
          }
          return null;
        })}

        <ContactShadows position={[0, -0.5, 0]} opacity={0.6} scale={15} blur={2.5} far={4} color="#000000" />
        
        <OrbitControls 
          ref={controlsRef}
          enablePan={false} 
          enableZoom={false} 
          maxPolarAngle={Math.PI / 2 + 0.1} 
          minPolarAngle={Math.PI / 3}
          autoRotate={!activeSpeakingAgentId}
          autoRotateSpeed={0.3}
        />
      </Canvas>
    </div>
  );
}

