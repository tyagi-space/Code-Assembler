import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Link } from "wouter";
import { ExternalLink, Calendar, User } from "lucide-react";
import { motion } from "framer-motion";

interface NewsCardProps {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  sourceName: string;
  category: string;
  publishedAt: string;
  index?: number;
}

export function NewsCard({ 
  id, 
  title, 
  description, 
  imageUrl, 
  sourceName, 
  category, 
  publishedAt,
  index = 0
}: NewsCardProps) {
  
  // Fallback image if none provided
  const displayImage = imageUrl || "https://images.unsplash.com/photo-1504711434969-e33886168f5c?q=80&w=2070&auto=format&fit=crop";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="h-full"
    >
      <Link href={`/news/${id}`} className="block h-full group cursor-pointer">
        <Card className="h-full overflow-hidden border-border/50 bg-card hover:shadow-xl hover:shadow-primary/5 hover:border-primary/20 transition-all duration-300 flex flex-col">
          <div className="relative aspect-[16/9] overflow-hidden">
            <img 
              src={displayImage} 
              alt={title} 
              className="object-cover w-full h-full transform transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute top-4 left-4">
              <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm text-foreground font-medium shadow-sm">
                {category}
              </Badge>
            </div>
          </div>
          
          <CardHeader className="p-5 pb-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground mb-3">
              <span className="font-semibold text-primary">{sourceName}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {formatDistanceToNow(new Date(publishedAt), { addSuffix: true })}
              </span>
            </div>
            <h3 className="font-display font-bold text-xl leading-tight line-clamp-2 group-hover:text-primary transition-colors">
              {title}
            </h3>
          </CardHeader>
          
          <CardContent className="p-5 pt-2 flex-grow">
            <p className="text-muted-foreground text-sm line-clamp-3 leading-relaxed">
              {description || "Click to read more about this story..."}
            </p>
          </CardContent>
          
          <CardFooter className="p-5 pt-0 mt-auto">
            <div className="text-sm font-medium text-primary flex items-center gap-1 group-hover:underline decoration-primary/30 underline-offset-4">
              Read full story <ExternalLink className="w-3 h-3 ml-1" />
            </div>
          </CardFooter>
        </Card>
      </Link>
    </motion.div>
  );
}
