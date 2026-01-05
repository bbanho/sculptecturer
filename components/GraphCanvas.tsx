import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Arrangement, EntityType, ValidationStatus } from '../types';
import { COLORS } from '../constants';

interface GraphCanvasProps {
  arrangement: Arrangement;
  width: number;
  height: number;
  onNodeClick: (type: EntityType, id: string) => void;
}

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
  type: EntityType;
  label: string;
  radius: number;
  color: string;
  strokeColor: string;
  strokeDash: string;
  isExperimental?: boolean;
}

interface GraphLink extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
  status: ValidationStatus;
}

export const GraphCanvas: React.FC<GraphCanvasProps> = ({ arrangement, width, height, onNodeClick }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Clear previous render

    // 1. Prepare Data
    const nodes: GraphNode[] = [];
    const links: GraphLink[] = [];

    // Add Central Container Node
    nodes.push({
      id: arrangement.container.id,
      type: EntityType.CONTAINER,
      label: arrangement.container.versionLabel,
      radius: 40,
      color: COLORS.container,
      strokeColor: '#ffffff',
      strokeDash: 'none'
    });

    // Add Service Nodes
    arrangement.services.forEach((svc) => {
      // Determine visuals based on Evaluation Status
      let color = COLORS.validated;
      let strokeColor = COLORS.validated;
      let strokeDash = 'none';

      if (svc.evaluationStatus === ValidationStatus.CONFLICT) {
        color = COLORS.conflict; // Red body
        strokeColor = '#fca5a5'; // Lighter red stroke
      } else if (svc.evaluationStatus === ValidationStatus.UNCERTAIN) {
        color = '#334155'; // Dark Slate (background-ish)
        strokeColor = COLORS.uncertain; // Slate 400
        strokeDash = '4,2'; // Dashed border
      } else {
         // Validated
         color = svc.isExperimental ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)'; // Transparent-ish
         strokeColor = svc.isExperimental ? COLORS.serviceExperimental : COLORS.service;
      }

      nodes.push({
        id: svc.id,
        type: EntityType.SERVICE,
        label: svc.name,
        radius: 25,
        color: color,
        strokeColor: strokeColor,
        strokeDash: strokeDash,
        isExperimental: svc.isExperimental
      });

      // Link Status mirrors the service evaluation status for now,
      // representing the "integration health".
      links.push({
        source: arrangement.container.id,
        target: svc.id,
        status: svc.evaluationStatus,
      });
    });

    // 2. Simulation Setup
    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(140))
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collide", d3.forceCollide().radius((d: any) => d.radius + 15));

    // 3. Render Elements
    const linkGroup = svg.append("g").attr("class", "links");
    const nodeGroup = svg.append("g").attr("class", "nodes");

    // Definitions for markers (arrows, patterns) could go here

    const link = linkGroup.selectAll("line")
      .data(links)
      .enter().append("line")
      .attr("stroke-width", (d) => d.status === ValidationStatus.CONFLICT ? 3 : 2)
      .attr("stroke", (d) => {
        if (d.status === ValidationStatus.CONFLICT) return COLORS.conflict;
        if (d.status === ValidationStatus.UNCERTAIN) return COLORS.uncertain;
        return COLORS.validated;
      })
      .attr("stroke-opacity", 0.6)
      .attr("stroke-dasharray", (d) => {
        if (d.status === ValidationStatus.UNCERTAIN) return "5,5";
        return "none";
      });

    const node = nodeGroup.selectAll("g")
      .data(nodes)
      .enter().append("g")
      .call(d3.drag<SVGGElement, GraphNode>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    // Draw Node Shapes
    node.each(function(d) {
      const g = d3.select(this);
      
      if (d.type === EntityType.CONTAINER) {
        // Container = Hexagon (simulated by path or rect)
        g.append("rect")
          .attr("width", d.radius * 2)
          .attr("height", d.radius * 2)
          .attr("x", -d.radius)
          .attr("y", -d.radius)
          .attr("rx", 8) // rounded corners
          .attr("fill", d.color)
          .attr("stroke", d.strokeColor)
          .attr("stroke-width", 3)
          .attr("class", "shadow-lg");
          
        // Icon/Text inside
      } else {
        // Service = Circle
        g.append("circle")
          .attr("r", d.radius)
          .attr("fill", d.color)
          .attr("stroke", d.strokeColor)
          .attr("stroke-width", 2)
          .attr("stroke-dasharray", d.strokeDash);
          
        if (d.isExperimental) {
             g.append("text")
             .text("EXP")
             .attr("y", -d.radius - 8)
             .attr("text-anchor", "middle")
             .attr("font-size", "9px")
             .attr("fill", COLORS.serviceExperimental)
             .attr("font-weight", "bold");
        }
      }
      
      // Labels
      g.append("text")
        .text(d.label)
        .attr("x", 0)
        .attr("y", d.type === EntityType.CONTAINER ? 0 : 5)
        .attr("text-anchor", "middle")
        .attr("dominant-baseline", "middle")
        .attr("fill", "#fff")
        .attr("font-size", d.type === EntityType.CONTAINER ? "12px" : "10px")
        .attr("font-weight", d.type === EntityType.CONTAINER ? "bold" : "normal")
        .attr("pointer-events", "none")
        .style("text-shadow", "0 2px 4px rgba(0,0,0,0.9)");

      // Status Icon for Services (mini indicator)
      if (d.type === EntityType.SERVICE && d.strokeColor === COLORS.conflict) {
          g.append("text")
           .text("!")
           .attr("x", d.radius - 5)
           .attr("y", -d.radius + 5)
           .attr("fill", COLORS.conflict)
           .attr("font-weight", "bold")
           .attr("font-size", "14px");
      }
      if (d.type === EntityType.SERVICE && d.strokeDash !== 'none') {
          g.append("text")
           .text("?")
           .attr("x", d.radius - 5)
           .attr("y", -d.radius + 5)
           .attr("fill", COLORS.uncertain)
           .attr("font-weight", "bold")
           .attr("font-size", "14px");
      }
    });

    node.on("click", (event, d) => {
      onNodeClick(d.type, d.id);
    });

    // 4. Tick Function
    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    // Drag interactions
    function dragstarted(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: any, d: any) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: any, d: any) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [arrangement, width, height, onNodeClick]);

  return <svg ref={svgRef} width={width} height={height} className="cursor-grab active:cursor-grabbing" />;
};